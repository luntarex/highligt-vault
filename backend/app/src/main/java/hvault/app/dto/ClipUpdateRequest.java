package hvault.app.dto;

import java.util.List;

import hvault.app.enums.VisibilityStatus;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ClipUpdateRequest {
    @Size(max = 100)
    private String title;

    private String notes;
    private String game;
    private VisibilityStatus visibilityStatus;
    private List<String> tags;
}
