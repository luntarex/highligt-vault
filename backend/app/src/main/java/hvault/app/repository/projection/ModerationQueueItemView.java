package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface ModerationQueueItemView {
    Long getClipId();
    String getTitle();
    String getVideoUrl();
    String getThumbnailUrl();
    Long getUploaderId();
    String getUploaderUsername();
    String getModerationStatus();
    Integer getModerationScore();
    String getModerationReason();
    String getModerationCategory();
    String getVisibilityStatus();
    LocalDateTime getCreatedAt();
}
