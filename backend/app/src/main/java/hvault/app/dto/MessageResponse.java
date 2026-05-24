package hvault.app.dto;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class MessageResponse {
    private Long id;
    private Long senderId;
    private Long receiverId;
    private String content;
    private Boolean isRead;
    private LocalDateTime createdAt;
    private Long sharedPostId;
    private PostFeedResponse sharedPost;
    private Boolean canDeleteForEveryone;
}
