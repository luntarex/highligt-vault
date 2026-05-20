package hvault.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class PostAuthorResponse {
    private Long id;
    private String username;
    private String profilePhotoUrl;
}
