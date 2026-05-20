package hvault.app.repository.projection;

public interface CommentedClipView {
    Long getId();
    String getTitle();
    String getVideoUrl();
    String getThumbnailUrl();
    Double getDuration();
    Double getStartTime();
    Double getEndTime();
    String getGameName();
}
