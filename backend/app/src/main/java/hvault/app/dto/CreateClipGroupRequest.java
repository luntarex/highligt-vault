package hvault.app.dto;

import java.util.List;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateClipGroupRequest {
    @NotBlank
    private String name;

    private String description;

    private String type;

    private List<Long> clipIds;
}
