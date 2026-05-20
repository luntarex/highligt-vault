package hvault.app.dto;

import java.time.LocalDateTime;
import lombok.AllArgsConstructor;
import lombok.Data;
import lombok.NoArgsConstructor;

@Data
@NoArgsConstructor
@AllArgsConstructor
public class UserListResponse {
    private Long id;
    private String username;
    private String email;
    private String description;
    private String profilePhotoUrl;
    private LocalDateTime createdAt;
    private Boolean isAdmin;
    private Long postCount;
    private Long totalClips;
    private Long publicClipCount;
    private Long totalFavorites;
}
