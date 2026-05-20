package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface UserListView {
    Long getId();
    String getUsername();
    String getEmail();
    String getDescription();
    String getProfilePhotoUrl();
    LocalDateTime getCreatedAt();
    Boolean getIsAdmin();
    Long getPostCount();
    Long getTotalClips();
    Long getPublicClipCount();
    Long getTotalFavorites();
}
