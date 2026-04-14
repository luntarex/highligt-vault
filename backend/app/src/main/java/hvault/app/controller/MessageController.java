package hvault.app.controller;

import hvault.app.service.MessageService;
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

    /**
     * GET /api/messages/conversations?userId=...
     * Get list of all conversations for the user.
     */
    @GetMapping("/conversations")
    public ResponseEntity<?> getConversations(@RequestParam Long userId) {
        return ResponseEntity.ok(messageService.getConversations(userId));
    }

    /**
     * GET /api/messages/{userId}?currentUserId=...
     * Get conversation with a specific user.
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getConversation(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        return ResponseEntity.ok(messageService.getConversation(currentUserId, userId));
    }

    /**
     * POST /api/messages
     * Send a new message.
     */
    @PostMapping
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, Object> request) {
        Long senderId = Long.valueOf(request.get("senderId").toString());
        Long receiverId = Long.valueOf(request.get("receiverId").toString());
        String content = (String) request.get("content");
        
        messageService.sendMessage(senderId, receiverId, content);
        return ResponseEntity.ok(Map.of("message", "Message sent successfully"));
    }

    /**
     * PUT /api/messages/{id}/read
     * Mark a message as read.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        messageService.markAsRead(id);
        return ResponseEntity.ok(Map.of("message", "Message marked as read"));
    }
}
