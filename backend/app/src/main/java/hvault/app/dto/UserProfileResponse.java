package hvault.app.dto;

import com.fasterxml.jackson.annotation.JsonInclude;
import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
@JsonInclude(JsonInclude.Include.NON_NULL)
public class UserProfileResponse {
    private Long id;
    private String username;
    private String email;
    private String description;
    private String profilePhotoUrl;
    private Boolean isAdmin;
    private LocalDateTime createdAt;
    private Long followers;
    private Long following;
    private Long totalClips;
    private Long totalPosts;
    private Long totalFavorites;
}
