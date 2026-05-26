package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface ClipGroupView {
    Long getId();
    Long getUserId();
    String getName();
    String getDescription();
    LocalDateTime getCreatedAt();
    Long getClipCount();
    String getType();
    String getThumbnailUrl();
}
