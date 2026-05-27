package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface PostDetailsView {
    Long getId();
    String getCaption();
    LocalDateTime getCreatedAt();
    Long getClipId();
    Long getCommunityId();
    String getCommunityName();
    String getClipTitle();
    String getVideoUrl();
    Double getDuration();
    Double getStartTime();
    Double getEndTime();
    String getGameName();
    Long getAuthorId();
    String getAuthorName();
    String getAuthorPhoto();
    Long getLikes();
    Long getComments();
    Long getOriginalPostId();
    String getRepostType();
}
