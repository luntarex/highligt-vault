package hvault.app.dto;

import hvault.app.enums.ReportReason;
import hvault.app.enums.ReportTargetType;
import jakarta.validation.constraints.Size;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateReportRequest {
    @NotNull
    private ReportTargetType targetType;

    @NotNull
    private Long targetId;

    @NotNull
    private ReportReason reason;

    @Size(max = 1000)
    private String details;
}
