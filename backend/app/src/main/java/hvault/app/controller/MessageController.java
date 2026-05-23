package hvault.app.controller;

import hvault.app.dto.ApiMessageResponse;
import hvault.app.dto.MessageResponse;
import hvault.app.dto.SendMessageRequest;
import hvault.app.entity.Message;
import hvault.app.security.SecurityUtil;
import hvault.app.service.MessageRealtimeService;
import hvault.app.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;
    private final MessageRealtimeService realtimeService;

    public MessageController(MessageService messageService, MessageRealtimeService realtimeService) {
        this.messageService = messageService;
        this.realtimeService = realtimeService;
    }

    @GetMapping("/conversations")
    public ResponseEntity<?> getConversations(@RequestParam(required = false) Long userId, Authentication authentication) {
        return ResponseEntity.ok(messageService.getConversations(SecurityUtil.requireCurrentUserId(authentication)));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getConversation(
            @PathVariable Long userId,
            @RequestParam(required = false) Long currentUserId,
            Authentication authentication) {
        return ResponseEntity.ok(messageService.getConversation(SecurityUtil.requireCurrentUserId(authentication), userId));
    }

    @PostMapping
    public ResponseEntity<MessageResponse> sendMessage(@Valid @RequestBody SendMessageRequest request, Authentication authentication) {
        Long senderId = SecurityUtil.requireCurrentUserId(authentication);
        Message message = messageService.sendMessage(
            senderId,
            request.getReceiverId(),
            request.getContent(),
            request.getSharedPostId()
        );
        MessageResponse senderMessage = messageService.toMessageResponseForUser(message, senderId);
        MessageResponse receiverMessage = messageService.toMessageResponseForUser(message, message.getReceiverId());

        realtimeService.sendMessageEvent(
            senderId,
            senderMessage,
            messageService.toConversationResponseForUser(senderId, message.getReceiverId(), message)
        );
        realtimeService.sendMessageEvent(
            message.getReceiverId(),
            receiverMessage,
            messageService.toConversationResponseForUser(message.getReceiverId(), senderId, message)
        );

        return ResponseEntity.ok(senderMessage);
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<ApiMessageResponse> markAsRead(@PathVariable Long id, Authentication authentication) {
        messageService.markAsRead(id, SecurityUtil.requireCurrentUserId(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Message marked as read"));
    }

    @DeleteMapping("/conversation")
    public ResponseEntity<ApiMessageResponse> deleteConversation(
            @RequestParam(required = false) Long userId1,
            @RequestParam Long userId2,
            Authentication authentication) {
        messageService.deleteConversation(SecurityUtil.requireCurrentUserId(authentication), userId2);
        return ResponseEntity.ok(new ApiMessageResponse("Conversation deleted successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> deleteMessage(@PathVariable Long id, Authentication authentication) {
        messageService.deleteMessage(id, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Message deleted successfully"));
    }

    @DeleteMapping("/batch")
    public ResponseEntity<ApiMessageResponse> deleteMessages(@RequestParam List<Long> ids, Authentication authentication) {
        messageService.deleteMessages(ids, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Messages deleted successfully"));
    }
}
