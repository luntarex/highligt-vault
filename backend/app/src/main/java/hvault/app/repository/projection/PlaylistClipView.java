package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface PlaylistClipView {
    Long getId();
    String getTitle();
    String getUrl();
    String getThumbnailUrl();
    Double getDuration();
    Double getStartTime();
    Double getEndTime();
    String getNotes();
    String getGame();
    LocalDateTime getAddedAt();
}
