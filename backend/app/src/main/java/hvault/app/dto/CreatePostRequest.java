package hvault.app.dto;

import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreatePostRequest {
    @NotNull
    private Long userId;

    @NotNull
    private Long clipId;

    private String caption;
}
