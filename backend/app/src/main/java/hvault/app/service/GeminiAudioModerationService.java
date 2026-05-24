package hvault.app.service;

import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.node.ArrayNode;
import com.fasterxml.jackson.databind.node.ObjectNode;
import java.util.Base64;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.web.client.RestTemplate;

@Service
public class GeminiAudioModerationService {
    private static final Logger logger = LoggerFactory.getLogger(GeminiAudioModerationService.class);
    private static final String GEMINI_GENERATE_URL = "https://generativelanguage.googleapis.com/v1beta/models/";

    private final ObjectMapper objectMapper = new ObjectMapper();
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${app.moderation.ai.enabled:false}")
    private boolean enabled;

    @Value("${gemini.api-key:}")
    private String apiKey;

    @Value("${app.moderation.gemini.audio-model:gemini-2.5-flash-lite}")
    private String audioModel;

    public Optional<AudioModerationSignal> moderateSamples(List<AudioModerationSample> samples) {
        if (!enabled || apiKey == null || apiKey.isBlank() || samples == null || samples.isEmpty()) {
            return Optional.empty();
        }

        try {
            logger.info("Sending Gemini audio moderation request with {} sample(s) using model {}", samples.size(), audioModel);

            HttpHeaders headers = new HttpHeaders();
            headers.add("x-goog-api-key", apiKey);
            headers.setContentType(MediaType.APPLICATION_JSON);

            String payload = buildPayload(samples);
            String response = restTemplate.postForObject(
                GEMINI_GENERATE_URL + normalizedModelName() + ":generateContent",
                new HttpEntity<>(payload, headers),
                String.class
            );

            return parseSignal(response);
        } catch (Exception e) {
            logger.warn("Gemini audio moderation failed: {}", safeMessage(e));
            return Optional.empty();
        }
    }

    private String buildPayload(List<AudioModerationSample> samples) throws Exception {
        ObjectNode root = objectMapper.createObjectNode();
        ArrayNode contents = root.putArray("contents");
        ObjectNode content = contents.addObject();
        content.put("role", "user");
        ArrayNode parts = content.putArray("parts");

        parts.addObject().put("text", buildPrompt());
        for (AudioModerationSample sample : samples) {
            parts.addObject().put("text", "Audio sample starting at " + sample.startSecond() + " seconds.");
            ObjectNode inlineData = parts.addObject().putObject("inline_data");
            inlineData.put("mime_type", "audio/mpeg");
            inlineData.put("data", Base64.getEncoder().encodeToString(sample.bytes()));
        }

        ObjectNode generationConfig = root.putObject("generationConfig");
        generationConfig.put("temperature", 0);
        generationConfig.put("responseMimeType", "application/json");

        return objectMapper.writeValueAsString(root);
    }

    private String buildPrompt() {
        return "You are the audio moderation engine for Highlight Vault, a gaming clip sharing platform. "
            + "Analyze only the provided audio samples. Transcribe important speech briefly and decide whether the audio is safe for public feeds. "
            + "Normal gameplay comms, game sound effects, excitement, and mild non-targeted profanity can be allowed. "
            + "Flag credible threats, targeted harassment, hate speech, extremist praise, sexual content, self-harm encouragement, illegal instructions, or audio that clearly makes the clip non-gaming. "
            + "Return only JSON with keys: decision, risk_score, primary_category, transcript, reason. "
            + "decision must be one of APPROVE_AUDIO, NEEDS_REVIEW, REJECT_AUDIO. "
            + "primary_category must be one of CLEAN_AUDIO, THREATS, HARASSMENT, HATE_SPEECH, EXTREMIST_OR_HATE, SEXUAL_CONTENT, SELF_HARM, ILLEGAL_ACTIVITY, NON_GAMING_AUDIO, OTHER_POLICY_RISK.";
    }

    private Optional<AudioModerationSignal> parseSignal(String response) throws Exception {
        if (response == null || response.isBlank()) {
            return Optional.empty();
        }

        JsonNode root = objectMapper.readTree(response);
        String text = root.path("candidates")
            .path(0)
            .path("content")
            .path("parts")
            .path(0)
            .path("text")
            .asText("");

        if (text.isBlank()) {
            return Optional.empty();
        }

        JsonNode decisionJson = objectMapper.readTree(extractJsonObject(text));
        String decision = textValue(decisionJson, "decision", "NEEDS_REVIEW");
        int score = clamp(decisionJson.path("risk_score").asInt(0));
        String category = textValue(decisionJson, "primary_category", decision);
        String transcript = limit(textValue(decisionJson, "transcript", ""), 2000);
        String reason = textValue(decisionJson, "reason", "Gemini audio moderation completed.");
        boolean flagged = !"APPROVE_AUDIO".equals(decision) || score >= 40;

        return Optional.of(new AudioModerationSignal(
            flagged,
            score,
            category,
            transcript,
            "Gemini audio decision: " + decision + ". " + reason,
            extractJsonObject(text)
        ));
    }

    private String extractJsonObject(String text) {
        String trimmed = text.trim();
        int start = trimmed.indexOf('{');
        int end = trimmed.lastIndexOf('}');
        if (start >= 0 && end > start) {
            return trimmed.substring(start, end + 1);
        }
        return trimmed;
    }

    private String textValue(JsonNode node, String key, String fallback) {
        String value = node.path(key).asText("");
        return value == null || value.isBlank() ? fallback : value;
    }

    private String normalizedModelName() {
        return audioModel.startsWith("models/") ? audioModel.substring("models/".length()) : audioModel;
    }

    private int clamp(int score) {
        return Math.max(0, Math.min(100, score));
    }

    private String limit(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private String safeMessage(Exception e) {
        return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
    }
}
