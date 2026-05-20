package hvault.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreatePlaylistRequest {
    @NotNull
    private Long userId;

    @NotBlank
    private String name;

    private String description;
}
