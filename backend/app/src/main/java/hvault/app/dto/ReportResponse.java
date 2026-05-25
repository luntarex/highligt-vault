package hvault.app.dto;

import java.time.LocalDateTime;

import hvault.app.enums.ReportReason;
import hvault.app.enums.ReportStatus;
import hvault.app.enums.ReportTargetType;
import lombok.Data;

@Data
public class ReportResponse {
    private Long id;
    private Long reporterId;
    private ReportTargetType targetType;
    private Long targetId;
    private ReportReason reason;
    private String details;
    private ReportStatus status;
    private LocalDateTime createdAt;
    private Long reviewedBy;
    private LocalDateTime reviewedAt;
    private String resolution;
    private String reporterUsername;
    private Long targetPostId;
    private ModerationQueueItemResponse targetClip;
}
