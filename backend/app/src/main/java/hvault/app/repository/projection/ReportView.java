package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface ReportView {
    Long getId();
    Long getReporterId();
    String getTargetType();
    Long getTargetId();
    String getReason();
    String getDetails();
    String getStatus();
    LocalDateTime getCreatedAt();
    Long getReviewedBy();
    LocalDateTime getReviewedAt();
    String getResolution();
    String getReporterUsername();
}
