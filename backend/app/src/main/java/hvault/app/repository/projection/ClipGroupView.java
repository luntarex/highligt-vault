package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface ClipGroupView {
    Long getId();
    String getName();
    String getDescription();
    Long getUserId();
    LocalDateTime getCreatedAt();
    String getType();
    String getThumbnailUrl();
}
