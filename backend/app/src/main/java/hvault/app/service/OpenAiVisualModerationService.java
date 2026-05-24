package hvault.app.service;

import java.util.List;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class OpenAiVisualModerationService {
    private static final Logger logger = LoggerFactory.getLogger(OpenAiVisualModerationService.class);
    private static final String RESPONSES_URL = "https://api.openai.com/v1/responses";

    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.moderation.ai.enabled:false}")
    private boolean enabled;

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${app.moderation.ai.model:gpt-5.4}")
    private String model;

    public Optional<VisualModerationSignal> scanImageUrl(String imageUrl) {
        return scanImageReference(imageUrl, "");
    }

    public Optional<VisualModerationSignal> scanImageUrl(String imageUrl, String contextText) {
        return scanImageReference(imageUrl, contextText);
    }

    public Optional<VisualModerationSignal> scanImageDataUrl(String imageDataUrl) {
        return scanImageReference(imageDataUrl, "");
    }

    public Optional<VisualModerationSignal> scanImageDataUrl(String imageDataUrl, String contextText) {
        return scanImageReference(imageDataUrl, contextText);
    }

    public Optional<VisualModerationSignal> scanClip(List<String> imageReferences, String contextText) {
        Optional<VisualModerationSignal> configurationProblem = configurationProblemSignal();
        if (configurationProblem.isPresent()) {
            return configurationProblem;
        }
        if (imageReferences == null || imageReferences.isEmpty()) {
            return Optional.empty();
        }

        List<String> usableImages = imageReferences.stream()
            .filter(image -> image != null && !image.isBlank())
            .limit(4)
            .toList();
        if (usableImages.isEmpty()) {
            return Optional.empty();
        }

        try {
            logger.info("Sending OpenAI clip moderation request with {} frame(s) using model {}", usableImages.size(), model);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            StringBuilder content = new StringBuilder();
            content.append("{\"type\":\"input_text\",\"text\":\"")
                .append(escape(buildClipPrompt(contextText)))
                .append("\"}");
            for (String imageReference : usableImages) {
                content.append(",{\"type\":\"input_image\",\"image_url\":\"")
                    .append(escape(imageReference))
                    .append("\",\"detail\":\"low\"}");
            }

            String payload = "{"
                + "\"model\":\"" + escape(model) + "\","
                + "\"input\":[{"
                + "\"role\":\"user\","
                + "\"content\":[" + content + "]"
                + "}],"
                + "\"text\":{\"format\":" + moderationDecisionSchema() + "},"
                + "\"max_output_tokens\":300"
                + "}";

            String response = restTemplate.postForObject(
                RESPONSES_URL,
                new HttpEntity<>(payload, headers),
                String.class
            );

            Optional<VisualModerationSignal> signal = parseSignal(response);
            signal.ifPresent(result -> logger.info(
                "OpenAI clip moderation completed: category={}, flagged={}, score={}",
                result.category(),
                result.flagged(),
                result.score()
            ));
            return signal;
        } catch (Exception e) {
            logger.warn("OpenAI clip moderation request failed: {}", safeMessage(e));
            return unavailableSignal(e);
        }
    }

    private Optional<VisualModerationSignal> scanImageReference(String imageReference, String contextText) {
        Optional<VisualModerationSignal> configurationProblem = configurationProblemSignal();
        if (configurationProblem.isPresent()) {
            return configurationProblem;
        }
        if (imageReference == null || imageReference.isBlank()) {
            return Optional.empty();
        }

        try {
            logger.info("Sending OpenAI thumbnail moderation request using model {}", model);
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            String prompt = buildPrompt(contextText);

            String payload = "{"
                + "\"model\":\"" + escape(model) + "\","
                + "\"input\":[{"
                + "\"role\":\"user\","
                + "\"content\":["
                + "{\"type\":\"input_text\",\"text\":\"" + escape(prompt) + "\"},"
                + "{\"type\":\"input_image\",\"image_url\":\"" + escape(imageReference) + "\",\"detail\":\"low\"}"
                + "]}],"
                + "\"text\":{\"format\":" + moderationDecisionSchema() + "},"
                + "\"max_output_tokens\":300"
                + "}";

            String response = restTemplate.postForObject(
                RESPONSES_URL,
                new HttpEntity<>(payload, headers),
                String.class
            );

            Optional<VisualModerationSignal> signal = parseSignal(response);
            signal.ifPresent(result -> logger.info(
                "OpenAI thumbnail moderation completed: category={}, flagged={}, score={}",
                result.category(),
                result.flagged(),
                result.score()
            ));
            return signal;
        } catch (Exception e) {
            logger.warn("OpenAI thumbnail moderation request failed: {}", safeMessage(e));
            return unavailableSignal(e);
        }
    }

    private String buildPrompt(String contextText) {
        String safeContext = contextText == null || contextText.isBlank()
            ? "No extra clip metadata was provided."
            : contextText;

        return "You are the moderation decision engine for Highlight Vault, a gaming clip sharing platform. "
            + "Think semantically and contextually; do not behave like a keyword matcher. "
<<<<<<< Updated upstream
            + "Analyze this frame plus metadata and produce a strict JSON decision matching the provided schema. "
=======
            + "Analyze this frame plus metadata, including any audio transcript and recent moderator feedback if present, and produce a strict JSON decision matching the provided schema. "
>>>>>>> Stashed changes
            + "Approve only content whose main purpose is gaming, esports, gameplay, game UI, gaming tutorials, "
            + "game reviews, or game-centered creator content. Do not auto-approve real-world political propaganda, "
            + "extremist or hate movement content, real-world violence, shock/offense content, sexual content, nudity, "
            + "self-harm, illegal activity, or non-gaming media. Fictional violence or political themes inside an obvious game can be allowed. "
<<<<<<< Updated upstream
=======
            + "If the audio transcript contains credible threats, targeted harassment, hate speech, extremist praise, sexual content, self-harm encouragement, or illegal instructions, treat that as policy evidence even when the image looks safe. "
            + "Use recent moderator feedback only to stay consistent with site policy; do not copy it blindly and do not let it override severe safety evidence. "
>>>>>>> Stashed changes
            + "If evidence is ambiguous, choose NEEDS_REVIEW, not APPROVE_PUBLIC. "
            + "Clip metadata: " + safeContext;
    }

    private String buildClipPrompt(String contextText) {
        String safeContext = contextText == null || contextText.isBlank()
            ? "No extra clip metadata was provided."
            : contextText;

        return "You are the moderation decision engine for Highlight Vault, a gaming clip sharing platform. "
            + "Think semantically and contextually; do not behave like a keyword matcher. "
<<<<<<< Updated upstream
            + "You will receive several extracted frames from the same video plus clip metadata. "
=======
            + "You will receive several extracted frames from the same video plus clip metadata, possibly an audio transcript, and possibly recent moderator feedback. "
>>>>>>> Stashed changes
            + "Your job is to decide whether this clip can be published publicly, needs human review, or should be rejected from public feeds. "
            + "Allowed content: gameplay, esports, game UI, game highlights, gaming tutorials, game reviews, "
            + "and creator content clearly centered on games. "
            + "Do not auto-approve uploads whose main purpose is unrelated to games, real-world political or ideological propaganda, "
            + "extremist or hate movement content, real-world violence/conflict footage, shock/offense content, sexual content, "
            + "nudity, self-harm, illegal activity, harassment, or hateful symbols. "
<<<<<<< Updated upstream
=======
            + "If the audio transcript contains credible threats, targeted harassment, hate speech, extremist praise, sexual content, self-harm encouragement, or illegal instructions, treat that as policy evidence even when the frames look safe. "
            + "Use recent moderator feedback only to stay consistent with site policy; do not copy it blindly and do not let it override severe safety evidence. "
>>>>>>> Stashed changes
            + "Important nuance: fictional violence, weapons, factions, controversial missions, or political themes inside an obvious video game can be allowed. "
            + "If the evidence is ambiguous, choose NEEDS_REVIEW instead of APPROVE_PUBLIC. "
            + "Use REJECT_PUBLIC for clearly severe unsafe content; use NEEDS_REVIEW for uncertain game relevance or uncertain policy context. "
            + "Clip metadata: " + safeContext;
    }

    private Optional<VisualModerationSignal> parseSignal(String response) {
        if (response == null || response.isBlank()) {
            return Optional.empty();
        }

        String output = unescapeJson(extractFirst(response, "\\\"text\\\"\\s*:\\s*\\\"((?:\\\\.|[^\\\"])*)\\\"").orElse(response));
        String decision = extractString(output, "decision").orElse("");
        String safeDecision = decision.isBlank() ? "UNKNOWN" : decision;
        String category = extractString(output, "primary_category").orElse(decision.isBlank() ? "AI_VISUAL" : decision);
        String gameRelevance = extractString(output, "game_relevance").orElse("UNKNOWN");
        String safetySeverity = extractString(output, "safety_severity").orElse("UNKNOWN");
        int confidence = clamp(extractInteger(output, "confidence").orElse(0));
        int riskScore = clamp(extractInteger(output, "risk_score").orElse(extractInteger(output, "score").orElse(0)));
        boolean flagged = decision.isBlank()
            ? extractBoolean(output, "flagged").orElse(false)
            : !"APPROVE_PUBLIC".equals(decision);
        String reason = extractString(output, "reason").orElse("AI visual moderation completed.");
        return Optional.of(new VisualModerationSignal(
            flagged,
            riskScore,
            category,
            readableReason(safeDecision, category, gameRelevance, safetySeverity, confidence, reason),
            structuredAuditJson(safeDecision, confidence, riskScore, gameRelevance, safetySeverity, category, reason)
        ));
    }

    private String readableReason(
        String decision,
        String category,
        String gameRelevance,
        String safetySeverity,
        int confidence,
        String reason
    ) {
        return "AI decision: " + decision
            + ". Category: " + category
            + ". Game relevance: " + gameRelevance
            + ". Severity: " + safetySeverity
            + ". Confidence: " + confidence
            + "%. Reason: " + reason;
    }

    private String structuredAuditJson(
        String decision,
        int confidence,
        int riskScore,
        String gameRelevance,
        String safetySeverity,
        String category,
        String reason
    ) {
        return "{"
            + "\"decision\":\"" + escape(decision) + "\","
            + "\"confidence\":" + confidence + ","
            + "\"risk_score\":" + riskScore + ","
            + "\"game_relevance\":\"" + escape(gameRelevance) + "\","
            + "\"safety_severity\":\"" + escape(safetySeverity) + "\","
            + "\"primary_category\":\"" + escape(category) + "\","
            + "\"reason\":\"" + escape(reason) + "\""
            + "}";
    }

    private String moderationDecisionSchema() {
        return "{"
            + "\"type\":\"json_schema\","
            + "\"name\":\"clip_moderation_decision\","
            + "\"strict\":true,"
            + "\"schema\":{"
            + "\"type\":\"object\","
            + "\"additionalProperties\":false,"
            + "\"properties\":{"
            + "\"decision\":{\"type\":\"string\",\"enum\":[\"APPROVE_PUBLIC\",\"NEEDS_REVIEW\",\"REJECT_PUBLIC\"]},"
            + "\"confidence\":{\"type\":\"integer\"},"
            + "\"risk_score\":{\"type\":\"integer\"},"
            + "\"game_relevance\":{\"type\":\"string\",\"enum\":[\"CLEAR_GAMEPLAY\",\"GAME_RELATED_CREATOR_CONTENT\",\"AMBIGUOUS\",\"NOT_GAMING\"]},"
            + "\"safety_severity\":{\"type\":\"string\",\"enum\":[\"SAFE\",\"LOW\",\"MEDIUM\",\"HIGH\",\"SEVERE\"]},"
            + "\"primary_category\":{\"type\":\"string\",\"enum\":[\"CLEAN_GAMING\",\"AMBIGUOUS_GAME_RELEVANCE\",\"OFF_TOPIC_NON_GAMING\",\"REAL_WORLD_POLITICAL_PROPAGANDA\",\"EXTREMIST_OR_HATE\",\"REAL_WORLD_VIOLENCE\",\"SEXUAL_CONTENT\",\"SELF_HARM\",\"ILLEGAL_ACTIVITY\",\"HARASSMENT\",\"OTHER_POLICY_RISK\"]},"
            + "\"reason\":{\"type\":\"string\"}"
            + "},"
            + "\"required\":[\"decision\",\"confidence\",\"risk_score\",\"game_relevance\",\"safety_severity\",\"primary_category\",\"reason\"]"
            + "}"
            + "}";
    }

    private Optional<VisualModerationSignal> unavailableSignal(Exception e) {
        return Optional.of(new VisualModerationSignal(
            false,
            0,
            "AI_UNAVAILABLE",
            "AI visual moderation could not be completed; falling back to conservative moderation flow.",
            "{\"error\":\"" + escape(safeMessage(e)) + "\"}"
        ));
    }

    private Optional<VisualModerationSignal> configurationProblemSignal() {
        if (!enabled) {
            logger.warn("OpenAI moderation skipped because app.moderation.ai.enabled=false");
            return Optional.of(new VisualModerationSignal(
                false,
                0,
                "AI_DISABLED",
                "AI moderation is disabled, so the clip requires manual review before public publishing.",
                "{\"error\":\"AI moderation disabled\"}"
            ));
        }
        if (apiKey == null || apiKey.isBlank()) {
            logger.warn("OpenAI moderation skipped because OPENAI_API_KEY is missing");
            return Optional.of(new VisualModerationSignal(
                false,
                0,
                "AI_NOT_CONFIGURED",
                "AI moderation is not configured, so the clip requires manual review before public publishing.",
                "{\"error\":\"OPENAI_API_KEY missing\"}"
            ));
        }
        return Optional.empty();
    }

    private Optional<Boolean> extractBoolean(String json, String key) {
        return extractFirst(json, "\\\"" + Pattern.quote(key) + "\\\"\\s*:\\s*(true|false)")
            .map(Boolean::valueOf);
    }

    private Optional<Integer> extractInteger(String json, String key) {
        return extractFirst(json, "\\\"" + Pattern.quote(key) + "\\\"\\s*:\\s*(\\d+)")
            .map(Integer::valueOf);
    }

    private Optional<String> extractString(String json, String key) {
        return extractFirst(json, "\\\"" + Pattern.quote(key) + "\\\"\\s*:\\s*\\\"((?:\\\\.|[^\\\"])*)\\\"")
            .map(this::unescapeJson);
    }

    private Optional<String> extractFirst(String text, String pattern) {
        Matcher matcher = Pattern.compile(pattern).matcher(text);
        return matcher.find() ? Optional.of(matcher.group(1)) : Optional.empty();
    }

    private int clamp(int score) {
        return Math.max(0, Math.min(100, score));
    }

    private String escape(String value) {
        if (value == null) {
            return "";
        }
        return value.replace("\\", "\\\\").replace("\"", "\\\"").replace("\n", " ").replace("\r", " ");
    }

    private String unescapeJson(String value) {
        return value.replace("\\\"", "\"").replace("\\\\", "\\");
    }

    private String safeMessage(Exception e) {
        return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
    }
}

