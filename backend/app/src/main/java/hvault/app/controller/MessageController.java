package hvault.app.controller;

import hvault.app.dto.ApiMessageResponse;
import hvault.app.dto.SendMessageRequest;
import hvault.app.security.SecurityUtil;
import hvault.app.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    private final MessageService messageService;

    public MessageController(MessageService messageService) {
        this.messageService = messageService;
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
    public ResponseEntity<ApiMessageResponse> sendMessage(@Valid @RequestBody SendMessageRequest request, Authentication authentication) {
        messageService.sendMessage(SecurityUtil.requireCurrentUserId(authentication), request.getReceiverId(), request.getContent());
        return ResponseEntity.ok(new ApiMessageResponse("Message sent successfully"));
    }

    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        messageService.markAsRead(id);
        return ResponseEntity.ok(Map.of("message", "Message marked as read"));
    }

    @DeleteMapping("/conversation")
    public ResponseEntity<?> deleteConversation(
            @RequestParam Long userId1,
            @RequestParam Long userId2) {
        messageService.deleteConversation(userId1, userId2);
        return ResponseEntity.ok(Map.of("message", "Conversation deleted successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteMessage(@PathVariable Long id) {
        messageService.deleteMessage(id);
        return ResponseEntity.ok(Map.of("message", "Message deleted successfully"));
    }

    @DeleteMapping("/batch")
    public ResponseEntity<?> deleteMessages(@RequestParam List<Long> ids) {
        messageService.deleteMessages(ids);
        return ResponseEntity.ok(Map.of("message", "Messages deleted successfully"));
    }
}
