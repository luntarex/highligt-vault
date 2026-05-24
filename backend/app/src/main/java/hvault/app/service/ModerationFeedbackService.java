package hvault.app.service;

import hvault.app.entity.ModerationAction;
import hvault.app.enums.ModerationActionType;
import hvault.app.enums.ReportTargetType;
import hvault.app.repository.ModerationActionRepository;
import java.util.List;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class ModerationFeedbackService {
    private static final List<ModerationActionType> FEEDBACK_ACTIONS = List.of(
        ModerationActionType.APPROVE,
        ModerationActionType.REJECT,
        ModerationActionType.REMOVE,
        ModerationActionType.RESTORE
    );

    private final ModerationActionRepository moderationActionRepository;

    @Value("${app.moderation.feedback.enabled:true}")
    private boolean enabled;

    @Value("${app.moderation.feedback.max-examples:6}")
    private int maxExamples;

    public ModerationFeedbackService(ModerationActionRepository moderationActionRepository) {
        this.moderationActionRepository = moderationActionRepository;
    }

    public String buildFeedbackContext() {
        if (!enabled) {
            return "";
        }

        List<ModerationAction> actions = moderationActionRepository
            .findTop20ByTargetTypeAndActionInAndReasonIsNotNullOrderByCreatedAtDesc(ReportTargetType.CLIP, FEEDBACK_ACTIONS);

        List<String> examples = actions.stream()
            .filter(action -> action.getReason() != null && !action.getReason().isBlank())
            .limit(Math.max(1, maxExamples))
            .map(action -> action.getAction().name() + ": " + sanitize(action.getReason()))
            .filter(example -> example.length() > 4)
            .toList();

        if (examples.isEmpty()) {
            return "";
        }

        return "Recent moderator feedback examples for consistency. Treat these as guidance, not absolute rules: "
            + String.join(" || ", examples);
    }

    private String sanitize(String value) {
        String cleaned = value
            .replaceAll("https?://\\S+", "[url]")
            .replaceAll("[\\w.%+-]+@[\\w.-]+\\.[A-Za-z]{2,}", "[email]")
            .replaceAll("\\b\\d{6,}\\b", "[number]")
            .replaceAll("\\s+", " ")
            .trim();

        if (cleaned.length() > 240) {
            return cleaned.substring(0, 240);
        }
        return cleaned;
    }
}
