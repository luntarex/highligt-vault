package hvault.app.dto;

import hvault.app.enums.ModerationActionType;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class ModerationDecisionRequest {
    @NotNull
    private Long moderatorId;

    private ModerationActionType action;

    private String reason;
}
