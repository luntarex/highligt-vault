package hvault.app.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Comment {
    private Long id;
    private String content;
    private LocalDateTime createdAt;
    private Long userId;
    private Long postId;
    private Long postCommentId; // optional parent comment
}
