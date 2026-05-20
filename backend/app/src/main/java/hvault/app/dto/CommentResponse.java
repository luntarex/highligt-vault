package hvault.app.dto;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CommentResponse {
    private Long id;
    private String content;
    private LocalDateTime createdAt;
    private Long userId;
    private Long postId;
    private Long parentCommentId;
    private String username;
    private String profilePhoto;
    private String postTitle;
    private String postThumbnail;
    private String postVideoUrl;
    private Double postDuration;
    private Double postStartTime;
    private Double postEndTime;
    private String postGameName;
    private String postAuthorName;
    private String postAuthorPhoto;
    private Long postAuthorId;
}
