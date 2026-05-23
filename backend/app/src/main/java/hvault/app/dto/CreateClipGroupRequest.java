package hvault.app.dto;

import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.NotNull;
import lombok.Data;

@Data
public class CreateClipGroupRequest {
    @NotNull
    private Long userId;

    @NotBlank
    private String name;

    private String description;
    
    private String type;
}
