package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface MessageConversationView {
    Long getOtherUserId();
    String getContent();
    LocalDateTime getCreatedAt();
    Boolean getIsRead();
    Long getSenderId();
    String getUsername();
    String getProfilePhotoUrl();
}
