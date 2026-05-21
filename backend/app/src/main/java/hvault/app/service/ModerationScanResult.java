package hvault.app.service;

import hvault.app.enums.ModerationStatus;
import hvault.app.enums.VisibilityStatus;

public record ModerationScanResult(
    ModerationStatus moderationStatus,
    VisibilityStatus visibilityStatus,
    int score,
    boolean flagged,
    String category,
    String reason
) {
    public boolean approvedForPublicFeed() {
        return visibilityStatus == VisibilityStatus.PUBLIC
            && (moderationStatus == ModerationStatus.AUTO_APPROVED || moderationStatus == ModerationStatus.APPROVED);
    }
}
