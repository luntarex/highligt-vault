package hvault.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import hvault.app.dto.ClipMetadataSuggestionRequest;
import hvault.app.dto.ClipMetadataSuggestionResponse;
import hvault.app.repository.GameRepository;
import jakarta.annotation.PreDestroy;
import java.util.ArrayList;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class ClipMetadataSuggestionService {
    private static final Logger logger = LoggerFactory.getLogger(ClipMetadataSuggestionService.class);
    private static final int MAX_TAGS = 3;
    private static final AtomicInteger METADATA_THREAD_COUNTER = new AtomicInteger();

    private final RestTemplate restTemplate = new RestTemplate();
    private final ObjectMapper objectMapper = new ObjectMapper();
    private final ExecutorService metadataPreparationExecutor = Executors.newFixedThreadPool(4, runnable -> {
        Thread thread = new Thread(runnable, "metadata-prep-" + METADATA_THREAD_COUNTER.incrementAndGet());
        thread.setDaemon(true);
        return thread;
    });
    private final GameRepository gameRepository;
    private final ClipMetadataExampleService clipMetadataExampleService;
    private final FfmpegFrameExtractionService frameExtractionService;
    private final FfmpegAudioExtractionService audioExtractionService;
    private final OpenAiAudioTranscriptionService audioTranscriptionService;

    @Value("${app.metadata.ai.enabled:true}")
    private boolean enabled;

    @Value("${app.metadata.ai.responses-url:https://api.byesu.com/v1/responses}")
    private String responsesUrl;

    @Value("${app.metadata.ai.api-key:}")
    private String apiKey;

    @Value("${app.metadata.ai.model:gpt-5.4}")
    private String model;

    @Value("${app.metadata.ai.fallback.responses-url:https://api.openai.com/v1/responses}")
    private String fallbackResponsesUrl;

    @Value("${app.metadata.ai.fallback.api-key:}")
    private String fallbackApiKey;

    @Value("${app.metadata.ai.fallback.model:gpt-5.4}")
    private String fallbackModel;

    @Value("${app.metadata.ai.audio.enabled:true}")
    private boolean audioEnabled;

    @Value("${app.metadata.ai.audio.max-samples:3}")
    private int maxAudioSamples;

    @Value("${app.metadata.ai.fragment-count:3}")
    private int metadataFragmentCount;

    @Value("${app.metadata.ai.fragment-seconds:4}")
    private int metadataFragmentSeconds;

    @Value("${app.metadata.ai.frames-per-fragment:2}")
    private int metadataFramesPerFragment;

    public ClipMetadataSuggestionService(
        GameRepository gameRepository,
        ClipMetadataExampleService clipMetadataExampleService,
        FfmpegFrameExtractionService frameExtractionService,
        FfmpegAudioExtractionService audioExtractionService,
        OpenAiAudioTranscriptionService audioTranscriptionService
    ) {
        this.gameRepository = gameRepository;
        this.clipMetadataExampleService = clipMetadataExampleService;
        this.frameExtractionService = frameExtractionService;
        this.audioExtractionService = audioExtractionService;
        this.audioTranscriptionService = audioTranscriptionService;
    }

    @PreDestroy
    public void shutdownMetadataPreparationExecutor() {
        metadataPreparationExecutor.shutdown();
    }

    public ClipMetadataSuggestionResponse suggest(ClipMetadataSuggestionRequest request, Long userId) {
        List<String> games = gameRepository.findAllGames().stream()
            .map(game -> game.getName())
            .filter(name -> name != null && !name.isBlank())
            .toList();
        String userExamples = buildUserExamples(userId);

        ClipMetadataSuggestionResponse fallback = fallbackSuggestion(request, games);
        if (!enabled || !hasConfiguredProvider()) {
            return fallback;
        }

        try {
            List<Map<String, Object>> content = new ArrayList<>();
            content.add(Map.of("type", "input_text", "text", buildPrompt(request, games, userExamples)));

            if (request.getThumbnailUrl() != null && !request.getThumbnailUrl().isBlank()) {
                content.add(Map.of(
                    "type", "input_image",
                    "image_url", request.getThumbnailUrl(),
                    "detail", "low"
                ));
            }

            CompletableFuture<List<String>> frameFuture = CompletableFuture.supplyAsync(
                () -> extractMetadataFrames(request),
                metadataPreparationExecutor
            );
            CompletableFuture<Optional<String>> audioTranscriptFuture = CompletableFuture.supplyAsync(
                () -> extractMetadataAudioTranscript(request),
                metadataPreparationExecutor
            );

            List<String> fragmentFrames = frameFuture.join();
            if (!fragmentFrames.isEmpty()) {
                content.add(Map.of(
                    "type", "input_text",
                    "text", "The following images are sampled from short fragments across the clip timeline in chronological order. Use them to detect special events that a single thumbnail may miss, such as knife kills, flicks, defuses, swings, clutches, fails, reactions, and objective changes."
                ));
            }
            fragmentFrames.stream()
                .limit(Math.max(1, metadataFragmentCount) * Math.max(1, metadataFramesPerFragment))
                .forEach(frame -> content.add(Map.of(
                    "type", "input_image",
                    "image_url", frame,
                    "detail", "low"
                )));

            audioTranscriptFuture.join()
                .map(value -> cleanText(value, 1800))
                .filter(value -> !value.isBlank())
                .ifPresent(value -> content.add(Map.of(
                    "type", "input_text",
                    "text", "Audio transcript for metadata only. Use speech, callouts, reactions, cheering, and sound cues to improve the title, note, and tags: " + value
                )));

            String response = postSuggestionRequestWithFallback(content);

            return normalize(parseSuggestion(response), fallback, games);
        } catch (Exception e) {
            logger.warn("AI clip metadata suggestion failed: {}", e.getMessage());
            return fallback;
        }
    }

    private boolean hasConfiguredProvider() {
        return hasText(apiKey) || hasText(fallbackApiKey);
    }

    private String postSuggestionRequestWithFallback(List<Map<String, Object>> content) throws Exception {
        AiMetadataProvider primary = new AiMetadataProvider("primary", responsesUrl, apiKey, model);
        AiMetadataProvider fallbackProvider = new AiMetadataProvider("fallback-openai", fallbackResponsesUrl, fallbackApiKey, fallbackModel);

        if (primary.configured()) {
            try {
                return postSuggestionRequest(primary, content);
            } catch (Exception e) {
                if (!fallbackProvider.configured()) {
                    throw e;
                }
                logger.warn("Primary AI metadata provider failed, trying OpenAI fallback: {}", safeMessage(e));
            }
        }

        if (fallbackProvider.configured()) {
            return postSuggestionRequest(fallbackProvider, content);
        }

        throw new IllegalStateException("No AI metadata provider is configured.");
    }

    private String postSuggestionRequest(AiMetadataProvider provider, List<Map<String, Object>> content) throws Exception {
        HttpHeaders headers = new HttpHeaders();
        headers.setBearerAuth(provider.apiKey());
        headers.setContentType(MediaType.APPLICATION_JSON);

        Map<String, Object> payload = Map.of(
            "model", provider.model(),
            "input", List.of(Map.of("role", "user", "content", content)),
            "text", Map.of("format", metadataSchema()),
            "max_output_tokens", 500
        );

        logger.info("Sending AI metadata request using {} provider and model {}", provider.name(), provider.model());
        return restTemplate.postForObject(
            provider.responsesUrl(),
            new HttpEntity<>(objectMapper.writeValueAsString(payload), headers),
            String.class
        );
    }

    private List<String> extractMetadataFrames(ClipMetadataSuggestionRequest request) {
        try {
            return frameExtractionService.extractFragmentFrameDataUrls(
                request.getVideoUrl(),
                request.getDuration() == null ? null : request.getDuration().floatValue(),
                metadataFragmentCount,
                metadataFramesPerFragment,
                metadataFragmentSeconds
            );
        } catch (Exception e) {
            logger.warn("Metadata frame extraction failed: {}", safeMessage(e));
            return List.of();
        }
    }

    private Optional<String> extractMetadataAudioTranscript(ClipMetadataSuggestionRequest request) {
        if (!audioEnabled) {
            return Optional.empty();
        }

        try {
            List<AudioModerationSample> samples = audioExtractionService.extractAudioSamples(
                request.getVideoUrl(),
                request.getDuration() == null ? null : request.getDuration().floatValue(),
                Math.max(1, Math.min(metadataFragmentCount, maxAudioSamples)),
                metadataFragmentSeconds
            );

            return audioTranscriptionService.transcribeSamplesForMetadata(samples);
        } catch (Exception e) {
            logger.warn("Metadata audio transcription failed: {}", safeMessage(e));
            return Optional.empty();
        }
    }

    private String buildPrompt(ClipMetadataSuggestionRequest request, List<String> games, String userExamples) {
        String gameList = games.isEmpty() ? "No existing games are configured." : String.join(", ", games);
        return "You create clean metadata for gaming highlight clips. "
            + "Use the filename, duration, thumbnail, frames, and audio samples when available. "
            + "Audio may include voice comms, reactions, game sounds, announcers, or silence. "
            + "Pick the most accurate game from the existing game list when possible; otherwise use Other. "
            + "Think semantically before writing the JSON: infer the clip's moment type, stakes, player action, game mechanic, outcome, emotion, and any audio cue. "
            + "For tactical shooters, also infer the player's side and objective state from the HUD, minimap, spike/bomb indicators, team icons, score banner, and objective text before choosing words. "
            + "Use attack-side language for attackers, defense-side language for defenders, and post-plant language only when the objective is planted. "
            + "Do not output this reasoning; use it only to create better metadata. "
            + "Treat the glossary and game terms as hints, not as a closed list. If the clip shows an unfamiliar game or mechanic, infer the nearest gaming concept from the evidence. "
            + "Use this gaming knowledge when interpreting visuals, captions, filenames, and speech: "
            + buildGamingGlossary()
            + " "
            + "Use these game-specific vocabularies as examples of domain language when the clip appears to match a game: "
            + buildGameSpecificVocabulary()
            + " "
            + "Title strategy: describe the meaningful moment, not just visible objects. Prefer titles shaped like actor or agent plus action plus context, mechanic plus outcome, or stakes plus result. "
            + "If uncertain, use a broad but still useful gaming concept like clutch, outplay, chase, comeback, save, reaction, fail, or funny moment. "
            + "Write a short catchy title as a natural title-case sentence, not a lowercase keyword list. "
            + "Good title examples: \"Sage Holds C Site\", \"Odin Locks Down Site\", \"Ninja Defuse\", \"Low HP Post-Plant Clutch\", \"Los Santos Night Stroll\", \"Box Fight Edit Course\", \"AWP Flick on Mirage\". "
            + "Do not copy raw filenames, folder names, random ids, upload ids, dates, or paths into the title. "
            + "Do not output titles like \"R/Zqvkh...\", \"Desktop 2026...\", \"sage c site hold\", or \"low hp post-plant clu\". "
            + "Keep titles under 55 characters and make them readable on a clip card. "
            + "Write a concise note that explains what makes the moment worth saving, using visual and audio evidence when available. "
            + "Write 1 to 3 lower-case tags. Tags should feel entertaining, special, and filter-worthy, not like tactical notes or every object in the clip. "
            + "Use tactical terms such as trade, entry, eco, save, smoke, flash, rotate, or post-plant to understand the clip, but avoid them as tags unless they are clearly the exciting point. "
            + "Prefer highlight-worthy tags inspired by this vocabulary, but create a better concise gaming tag when the evidence supports it: "
            + buildPreferredTags()
            + ". "
            + "Use only the most important tags; prefer specific moment, mechanic, emotion, or outcome tags over generic game-name tags. "
            + "Avoid bland role tags like hold, attack, defense, site, or round. Use those ideas in the title or note only when they clarify the moment. "
            + "Avoid generic filler tags like highlight, gameplay, teamplay, valorant, clip, video, gaming, attack, defense, plant, or round unless they are the main point of the clip. "
            + "If audio reveals the moment type, tag the actual moment or emotion, such as reaction, clutch, rage, ace, comeback, or funny. Do not use comms as a tag. "
            + "Do not invent unsafe, hateful, sexual, or non-gaming tags. "
            + "Return only JSON matching the schema. "
            + "Existing games: " + gameList + ". "
            + "Use these manually approved metadata examples as style guidance. Infer the user's style principles from them instead of copying them literally: "
            + (userExamples.isBlank() ? "No examples yet." : userExamples) + ". "
            + "Filename: " + safe(request.getFileName()) + ". "
            + "Relative folder path: " + safe(request.getRelativePath()) + ". "
            + "Duration seconds: " + (request.getDuration() == null ? "unknown" : request.getDuration()) + ".";
    }

    private String buildGamingGlossary() {
        return "ace=one player eliminates the enemy team; clutch=winning from a disadvantage; "
            + "1vX=one player against multiple opponents; retake=reclaiming a site/objective; "
            + "post-plant=after spike/bomb is planted; defuse=stopping planted objective; "
            + "lineup=pre-planned ability or grenade setup; flick=fast aim adjustment; "
            + "wallbang=damage or kill through cover; entry=first aggressive fight into space; "
            + "eco=low economy round; save=keeping gear instead of fighting; trade=teammate responds after a kill; "
            + "comms=voice communication; reaction=audible player response; whiff=missed easy shots; "
            + "beam=accurate tracking; snipe=long-range precision kill; outplay=winning through smarter movement or timing; "
            + "attacker=team trying to take site and plant the spike/bomb; defender=team trying to stop the plant or hold site; "
            + "anchor=defender holding a site, so avoid anchor for attacking-side clips unless clearly describing an enemy";
    }

    private String buildPreferredTags() {
        return "ace, clutch, 1v2, 1v3, 1v4, 1v5, knife kill, ninja defuse, defuse, no-scope, quickscope, one-tap, flick, wallbang, collateral, spray transfer, trickshot, headshot, sniper, snipe, beam, edit, box fight, clutch-up, comeback, outplay, rage, reaction, funny, fail, win";
    }

    private String buildGameSpecificVocabulary() {
        return "Valorant terms: agents like Jett, Sage, Reyna, Raze, Sova, Killjoy, Cypher, Omen, Brimstone, Viper, Phoenix; "
            + "maps/sites like Ascent A, Ascent B, Haven C, Bind Hookah, Split Heaven, Icebox Mid; "
            + "attacker language like site take, push, entry, clear, execute, swing punish, spike plant, post-plant; "
            + "defender language like anchor, hold, stall, retake, defuse; "
            + "moments like spike plant, spike defuse, post-plant, retake, entry, smoke, flash, recon, lineup, sheriff, operator, vandal, phantom. "
            + "CS2 terms: Mirage, Dust2, Inferno, Nuke, Ancient, Overpass, A site, B site, mid, connector, banana, palace, ramp; "
            + "moments like ace, clutch, AWP flick, deagle one-tap, spray transfer, smoke, flash, molly, retake, defuse, eco, force buy. "
            + "Fortnite terms: build fight, box fight, edit, piece control, crank, high ground, 90s, pump, shotgun, beam, snipe, trickshot, rotate, storm, reboot, Victory Royale. "
            + "GTA terms: Los Santos, heist, getaway, chase, drift, stunt jump, wanted level, police chase, roleplay, crew, street race, chaos. "
            + "Apex terms: knock, squad wipe, third party, armor swap, revive, respawn beacon, Kraber, wingman, zipline, portal. "
            + "Rocket League terms: aerial, ceiling shot, flip reset, double tap, demo, save, pinch, overtime goal";
    }

    private String buildUserExamples(Long userId) {
        try {
            return clipMetadataExampleService.buildExamplesForPrompt(userId);
        } catch (Exception e) {
            logger.warn("Could not load metadata examples for user {}: {}", userId, e.getMessage());
            return "";
        }
    }

    private ClipMetadataSuggestionResponse parseSuggestion(String response) throws Exception {
        if (response == null || response.isBlank()) {
            throw new IllegalArgumentException("Empty AI response");
        }

        JsonNode root = objectMapper.readTree(response);
        String text = findOutputText(root);
        if (text == null || text.isBlank()) {
            text = response;
        }

        JsonNode json = objectMapper.readTree(text);
        List<String> tags = new ArrayList<>();
        JsonNode tagsNode = json.path("tags");
        if (tagsNode.isArray()) {
            tagsNode.forEach(tag -> tags.add(tag.asText()));
        }
        return new ClipMetadataSuggestionResponse(
            json.path("title").asText(),
            json.path("game").asText(),
            json.path("notes").asText(),
            tags
        );
    }

    private String findOutputText(JsonNode node) {
        if (node == null) {
            return null;
        }
        if (node.isObject()) {
            String type = node.path("type").asText();
            if (("output_text".equals(type) || "text".equals(type)) && node.has("text")) {
                return node.path("text").asText();
            }
            var fields = node.fields();
            while (fields.hasNext()) {
                String found = findOutputText(fields.next().getValue());
                if (found != null) {
                    return found;
                }
            }
        } else if (node.isArray()) {
            for (JsonNode child : node) {
                String found = findOutputText(child);
                if (found != null) {
                    return found;
                }
            }
        }
        return null;
    }

    private ClipMetadataSuggestionResponse normalize(
        ClipMetadataSuggestionResponse suggestion,
        ClipMetadataSuggestionResponse fallback,
        List<String> games
    ) {
        String suggestedTitle = cleanTitle(suggestion.getTitle());
        String title = suggestedTitle.isBlank() || looksLikeBadTitle(suggestedTitle)
            ? fallback.getTitle()
            : titleCase(suggestedTitle);
        String game = normalizeGame(suggestion.getGame(), games, fallback.getGame());
        String notes = cleanText(suggestion.getNotes(), 280);
        if (notes.isBlank()) {
            notes = fallback.getNotes();
        }

        LinkedHashSet<String> tags = new LinkedHashSet<>();
        if (suggestion.getTags() != null) {
            suggestion.getTags().forEach(tag -> addTag(tags, tag));
        }
        if (tags.isEmpty()) {
            fallback.getTags().forEach(tag -> addTag(tags, tag));
        }

        return new ClipMetadataSuggestionResponse(
            cleanTitle(title),
            game,
            notes,
            tags.stream().limit(MAX_TAGS).toList()
        );
    }

    private ClipMetadataSuggestionResponse fallbackSuggestion(ClipMetadataSuggestionRequest request, List<String> games) {
        String sourceName = preferredSourceName(request);
        String title = cleanTitle(titleCase(titleFromFileName(request.getFileName())));
        if (title.isBlank()) {
            title = fallbackTitleForGame(detectGame(sourceName, games));
        }

        String game = detectGame(sourceName, games);
        List<String> tags = tagsFromFileName(sourceName);
        String notes = "Imported automatically from " + (sourceName == null ? "a selected folder" : sourceName) + ".";
        return new ClipMetadataSuggestionResponse(title, game, notes, tags);
    }

    private String preferredSourceName(ClipMetadataSuggestionRequest request) {
        if (request.getRelativePath() != null && !request.getRelativePath().isBlank()) {
            return request.getRelativePath();
        }
        return request.getFileName();
    }

    private String titleFromFileName(String fileName) {
        if (fileName == null || fileName.isBlank()) {
            return "";
        }
        String filenameOnly = fileName.replace("\\", "/");
        int slashIndex = filenameOnly.lastIndexOf('/');
        if (slashIndex >= 0) {
            filenameOnly = filenameOnly.substring(slashIndex + 1);
        }

        String withoutExtension = filenameOnly.replaceFirst("\\.[^.]+$", "");
        String readable = withoutExtension
            .replaceAll("(?i)^desktop\\s*", "")
            .replaceAll("\\b20\\d{2}[.\\-]\\d{2}[.\\-]\\d{2}\\b", "")
            .replaceAll("\\b\\d{2}[.\\-]\\d{2}[.\\-]\\d{2}(?:[.\\-]\\d{2})?\\b", "")
            .replaceAll("[_\\-.]+", " ")
            .replaceAll("\\s+", " ")
            .trim();
        if (readable.isBlank() || looksLikeBadTitle(readable)) {
            return "";
        }
        StringBuilder title = new StringBuilder();
        for (String word : readable.split(" ")) {
            if (word.isBlank()) {
                continue;
            }
            if (!title.isEmpty()) {
                title.append(' ');
            }
            title.append(word.substring(0, 1).toUpperCase(Locale.ROOT));
            if (word.length() > 1) {
                title.append(word.substring(1).toLowerCase(Locale.ROOT));
            }
        }
        return title.toString();
    }

    private String detectGame(String fileName, List<String> games) {
        String lower = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        return games.stream()
            .filter(game -> lower.contains(game.toLowerCase(Locale.ROOT)))
            .findFirst()
            .orElse("Other");
    }

    private String normalizeGame(String value, List<String> games, String fallback) {
        if (value == null || value.isBlank()) {
            return fallback;
        }
        return games.stream()
            .filter(game -> game.equalsIgnoreCase(value.trim()))
            .findFirst()
            .orElse(fallback == null || fallback.isBlank() ? "Other" : fallback);
    }

    private List<String> tagsFromFileName(String fileName) {
        Set<String> tags = new LinkedHashSet<>();
        String lower = fileName == null ? "" : fileName.toLowerCase(Locale.ROOT);
        for (String candidate : List.of("funny", "ace", "clutch", "fail", "sniper", "win", "comeback", "ranked")) {
            if (lower.contains(candidate)) {
                addTag(tags, candidate);
            }
        }
        if (tags.isEmpty()) {
            addTag(tags, "clip");
        }
        return tags.stream().limit(MAX_TAGS).toList();
    }

    private void addTag(Set<String> tags, String value) {
        String tag = cleanText(value, 30).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 -]", "").trim();
        if (!tag.isBlank()) {
            tags.add(tag);
        }
    }

    private String cleanTitle(String value) {
        String cleaned = cleanText(value, 55);
        return cleaned.length() > 55 ? cleaned.substring(0, 55).trim() : cleaned;
    }

    private boolean looksLikeBadTitle(String value) {
        if (value == null || value.isBlank()) {
            return true;
        }
        String trimmed = value.trim();
        String lower = trimmed.toLowerCase(Locale.ROOT);
        if (trimmed.contains("/") || trimmed.contains("\\") || lower.startsWith("desktop 20")) {
            return true;
        }
        if (lower.matches(".*\\b20\\d{2}[.\\-]\\d{2}[.\\-]\\d{2}\\b.*")) {
            return true;
        }
        String compact = trimmed.replaceAll("[^A-Za-z0-9]", "");
        long digits = compact.chars().filter(Character::isDigit).count();
        boolean hasVowels = compact.toLowerCase(Locale.ROOT).matches(".*[aeiou].*");
        return compact.length() >= 14 && (digits >= 5 || !hasVowels);
    }

    private String fallbackTitleForGame(String game) {
        if (game == null || game.isBlank() || "Other".equalsIgnoreCase(game)) {
            return "New Highlight";
        }
        return titleCase(game + " Highlight");
    }

    private String titleCase(String value) {
        if (value == null || value.isBlank()) {
            return "";
        }

        Set<String> smallWords = Set.of("a", "an", "and", "at", "by", "for", "in", "of", "on", "or", "the", "to", "vs");
        String[] words = value.replaceAll("\\s+", " ").trim().split(" ");
        List<String> titled = new ArrayList<>();
        for (int i = 0; i < words.length; i++) {
            String word = words[i];
            if (word.isBlank()) {
                continue;
            }
            String lower = word.toLowerCase(Locale.ROOT);
            boolean keepLower = i > 0 && i < words.length - 1 && smallWords.contains(lower);
            titled.add(keepLower ? lower : capitalizeTitleWord(word));
        }
        return String.join(" ", titled);
    }

    private String capitalizeTitleWord(String word) {
        if (word.length() <= 2 && word.equals(word.toUpperCase(Locale.ROOT))) {
            return word;
        }

        StringBuilder result = new StringBuilder();
        boolean capitalizeNext = true;
        for (char ch : word.toCharArray()) {
            if (!Character.isLetterOrDigit(ch)) {
                result.append(ch);
                capitalizeNext = true;
                continue;
            }
            result.append(capitalizeNext ? Character.toUpperCase(ch) : Character.toLowerCase(ch));
            capitalizeNext = false;
        }
        return result.toString();
    }

    private String cleanText(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String cleaned = value.replaceAll("[\\r\\n]+", " ").replaceAll("\\s+", " ").trim();
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength).trim();
    }

    private String safe(String value) {
        return value == null || value.isBlank() ? "unknown" : value;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private String safeMessage(Exception e) {
        return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
    }

    private record AiMetadataProvider(String name, String responsesUrl, String apiKey, String model) {
        private boolean configured() {
            return apiKey != null && !apiKey.isBlank()
                && responsesUrl != null && !responsesUrl.isBlank()
                && model != null && !model.isBlank();
        }
    }

    private Map<String, Object> metadataSchema() {
        return Map.of(
            "type", "json_schema",
            "name", "clip_metadata",
            "strict", true,
            "schema", Map.of(
                "type", "object",
                "additionalProperties", false,
                "properties", Map.of(
                    "title", Map.of("type", "string"),
                    "game", Map.of("type", "string"),
                    "notes", Map.of("type", "string"),
                    "tags", Map.of("type", "array", "items", Map.of("type", "string"))
                ),
                "required", List.of("title", "game", "notes", "tags")
            )
        );
    }
}
