package hvault.app.service;

import hvault.app.entity.ClipMetadataExample;
import hvault.app.repository.ClipMetadataExampleRepository;
import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import org.springframework.stereotype.Service;

@Service
public class ClipMetadataExampleService {
    private final ClipMetadataExampleRepository repository;

    public ClipMetadataExampleService(ClipMetadataExampleRepository repository) {
        this.repository = repository;
    }

    public void recordApprovedExample(Long userId, Long clipId, String gameName, String title, String notes, List<String> tags) {
        if (userId == null || clipId == null || title == null || title.isBlank()) {
            return;
        }

        ClipMetadataExample example = repository.findByUserIdAndSourceClipId(userId, clipId)
            .orElseGet(ClipMetadataExample::new);
        example.setUserId(userId);
        example.setSourceClipId(clipId);
        example.setGameName(cleanText(gameName, 100));
        example.setTitle(cleanText(title, 100));
        example.setNotes(cleanText(notes, 500));
        example.setTags(cleanTags(tags));
        example.setApprovedAt(LocalDateTime.now());
        repository.save(example);
    }

    public String buildExamplesForPrompt(Long userId) {
        if (userId == null) {
            return "";
        }

        String examples = repository.findTop20ByUserIdOrderByApprovedAtDesc(userId).stream()
            .limit(6)
            .map(this::toPromptExample)
            .filter(example -> !example.isBlank())
            .reduce((left, right) -> left + " | " + right)
            .orElse("");

        if (examples.isBlank()) {
            return "";
        }
        return "Style reference (your approved titles):\n" + examples;
    }

    private String toPromptExample(ClipMetadataExample example) {
        return "title=\"" + cleanText(example.getTitle(), 80)
            + "\" game=\"" + cleanText(example.getGameName(), 60)
            + "\" notes=\"" + cleanText(example.getNotes(), 140)
            + "\" tags=\"" + cleanText(example.getTags(), 120)
            + "\"";
    }

    private String cleanTags(List<String> tags) {
        if (tags == null || tags.isEmpty()) {
            return "";
        }

        return tags.stream()
            .map(tag -> cleanText(tag, 30).toLowerCase(Locale.ROOT).replaceAll("[^a-z0-9 -]", "").trim())
            .filter(tag -> !tag.isBlank())
            .distinct()
            .limit(8)
            .reduce((left, right) -> left + "," + right)
            .orElse("");
    }

    private String cleanText(String value, int maxLength) {
        if (value == null) {
            return "";
        }
        String cleaned = value.replaceAll("[\\r\\n]+", " ").replaceAll("\\s+", " ").trim();
        return cleaned.length() <= maxLength ? cleaned : cleaned.substring(0, maxLength).trim();
    }
}
