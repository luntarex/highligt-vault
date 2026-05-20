package hvault.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class SuggestedUserResponse {
    private Long id;
    private String username;
    private String profilePhotoUrl;
    private String description;
    private Long mutualCount;
    private Long followers;
}
