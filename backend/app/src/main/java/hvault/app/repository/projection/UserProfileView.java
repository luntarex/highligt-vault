package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface UserProfileView {
    Long getId();
    String getUsername();
    String getEmail();
    String getDescription();
    String getProfilePhotoUrl();
    Boolean getIsAdmin();
    LocalDateTime getCreatedAt();
    Long getFollowers();
    Long getFollowing();
    Long getTotalClips();
    Long getTotalPosts();
    Long getTotalFavorites();
}
