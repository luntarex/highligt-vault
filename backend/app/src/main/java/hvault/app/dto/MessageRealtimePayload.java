package hvault.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class MessageRealtimePayload {
    private String type;
    private MessageResponse message;
    private MessageConversationResponse conversation;
}
