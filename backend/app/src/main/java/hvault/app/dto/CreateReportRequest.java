package hvault.app.dto;

import hvault.app.enums.ReportReason;
import hvault.app.enums.ReportTargetType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateReportRequest {
    private Long reporterId;

    @NotNull
    private ReportTargetType targetType;

    @NotNull
    private Long targetId;

    @NotNull
    private ReportReason reason;

    private String details;
}
