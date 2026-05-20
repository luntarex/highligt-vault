package hvault.app.dto;

import lombok.Data;

@Data
public class UpdateUserProfileRequest {
    private String username;
    private String description;
    private String profilePhotoUrl;
}
