package hvault.app.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreatePostRequest {
    @NotNull
    private Long userId;

    private Long clipId;

    private Long communityId;

    private String caption;
}
