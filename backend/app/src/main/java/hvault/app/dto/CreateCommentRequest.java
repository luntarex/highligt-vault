package hvault.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateCommentRequest {
    @NotNull
    private Long postId;

    private Long userId;

    @NotBlank
    private String content;

    private Long parentCommentId;
}
