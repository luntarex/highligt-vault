package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface PlaylistView {
    Long getId();
    String getName();
    String getDescription();
    Long getUserId();
    LocalDateTime getCreatedAt();
}
