package hvault.app.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class UpdateCommunityThumbnailRequest {
    @NotBlank
    private String thumbnailUrl;
}
