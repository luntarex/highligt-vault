package hvault.app.dto;

import java.time.LocalDateTime;
import java.util.List;

import hvault.app.enums.ModerationStatus;
import hvault.app.enums.VisibilityStatus;
import lombok.Data;

@Data
public class ClipResponse {
    private Long id;
    private String title;
    private String url;
    private String thumbnailUrl;
    private Double duration;
    private Double startTime;
    private Double endTime;
    private String notes;
    private String game;
    private Boolean isDeleted;
    private LocalDateTime dateCreated;
    private Long uploaderId;
    private List<String> tags;
    private ModerationStatus moderationStatus;
    private Integer moderationScore;
    private String moderationReason;
    private VisibilityStatus visibilityStatus;
    private String removedReason;
}
