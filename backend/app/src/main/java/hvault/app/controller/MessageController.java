package hvault.app.controller;

import hvault.app.dto.SendMessageRequest;
import hvault.app.service.MessageService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
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
    public ResponseEntity<?> getConversations(@RequestParam Long userId) {
        return ResponseEntity.ok(messageService.getConversations(userId));
    }

    @GetMapping("/{userId}")
    public ResponseEntity<?> getConversation(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        return ResponseEntity.ok(messageService.getConversation(currentUserId, userId));
    }

    @PostMapping
    public ResponseEntity<?> sendMessage(@Valid @RequestBody SendMessageRequest request) {
        messageService.sendMessage(request.getSenderId(), request.getReceiverId(), request.getContent());
        return ResponseEntity.ok(Map.of("message", "Message sent successfully"));
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
