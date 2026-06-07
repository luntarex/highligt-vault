package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface UserPostView {
    Long getPostId();
    Long getClipId();
    String getCaption();
    String getClipTitle();
    String getThumbnailUrl();
    String getGameName();
    Double getDuration();
    LocalDateTime getCreatedAt();
}
