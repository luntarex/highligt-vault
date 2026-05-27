package hvault.app.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateCommunityRequest {
    @NotBlank
    private String name;

    private String description;

    private String rules;

    private String thumbnailUrl;
}
