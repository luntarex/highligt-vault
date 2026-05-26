package hvault.app.dto;

import java.util.List;

import jakarta.validation.constraints.NotEmpty;
import lombok.Data;

@Data
public class AddClipGroupItemsRequest {
    @NotEmpty
    private List<Long> clipIds;
}
