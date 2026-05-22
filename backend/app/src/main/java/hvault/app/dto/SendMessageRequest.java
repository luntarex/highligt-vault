package hvault.app.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class SendMessageRequest {
    private Long senderId;

    @NotNull
    private Long receiverId;

    private String content;

    private Long sharedPostId;
}
