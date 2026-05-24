package hvault.app.dto;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class MessageConversationResponse {
    private Long otherUserId;
    private String content;
    private LocalDateTime createdAt;
    private Boolean isRead;
    private Long senderId;
    private String username;
    private String profilePhotoUrl;
    private Long sharedPostId;
    private PostFeedResponse sharedPost;
    private Boolean sharedPostUnavailable;
}
