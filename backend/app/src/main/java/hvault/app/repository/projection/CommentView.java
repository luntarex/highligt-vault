package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface CommentView {
    Long getId();
    String getContent();
    LocalDateTime getCreatedAt();
    Long getUserId();
    Long getPostId();
    Long getParentCommentId();
    String getUsername();
    String getProfilePhoto();
    String getPostTitle();
    String getPostThumbnail();
    String getPostVideoUrl();
    Double getPostDuration();
    Double getPostStartTime();
    Double getPostEndTime();
    String getPostGameName();
    String getPostAuthorName();
    String getPostAuthorPhoto();
    Long getPostAuthorId();
}
