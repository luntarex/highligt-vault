package hvault.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class LoginResponse {
    private Long id;
    private String username;
    private String email;
    private String profilePhotoUrl;
    private Boolean isAdmin;
    private String token;
    private Boolean success;
}
