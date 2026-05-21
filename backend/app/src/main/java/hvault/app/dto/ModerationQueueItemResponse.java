package hvault.app.dto;

import java.time.LocalDateTime;

import hvault.app.enums.ModerationStatus;
import hvault.app.enums.VisibilityStatus;
import lombok.Data;

@Data
public class ModerationQueueItemResponse {
    private Long clipId;
    private String title;
    private String videoUrl;
    private String thumbnailUrl;
    private Long uploaderId;
    private String uploaderUsername;
    private ModerationStatus moderationStatus;
    private Integer moderationScore;
    private String moderationReason;
    private String moderationCategory;
    private VisibilityStatus visibilityStatus;
    private LocalDateTime createdAt;
}
