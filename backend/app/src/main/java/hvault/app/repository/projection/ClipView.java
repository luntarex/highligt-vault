package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface ClipView {
    Long getId();
    String getTitle();
    String getUrl();
    String getThumbnailUrl();
    Double getDuration();
    Double getStartTime();
    Double getEndTime();
    String getNotes();
    String getGame();
    Number getIsDeleted();
    LocalDateTime getDateCreated();
    Long getUploaderId();
    String getModerationStatus();
    Integer getModerationScore();
    String getModerationReason();
    LocalDateTime getModerationCheckedAt();
    Long getReviewedBy();
    LocalDateTime getReviewedAt();
    String getRemovedReason();
    LocalDateTime getRemovedAt();
    String getVisibilityStatus();
    Long getViewCount();
}
