package hvault.app.dto;

import hvault.app.enums.ModerationStatus;
import hvault.app.enums.VisibilityStatus;
import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class CreatePostResponse {
    private String message;
    private Long id;
    private boolean published;
    private ModerationStatus moderationStatus;
    private VisibilityStatus visibilityStatus;
    private String moderationReason;
}
