package hvault.app.dto;

import java.util.List;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class ClipMetadataSuggestionResponse {
    private String title;
    private String game;
    private String notes;
    private List<String> tags;
}
