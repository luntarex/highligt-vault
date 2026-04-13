package hvault.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/messages")
public class MessageController {

    /**
     * GET /api/messages/{userId}
     * Get conversation with a specific user.
     */
    @GetMapping("/{userId}")
    public ResponseEntity<?> getConversation(
            @PathVariable Long userId,
            @RequestParam Long currentUserId) {
        // TODO: Wire to MessageService
        return ResponseEntity.ok(List.of(
            Map.of("id", 1, "senderId", currentUserId, "receiverId", userId,
                    "content", "Stub message", "isRead", true)
        ));
    }

    /**
     * POST /api/messages
     * Send a new message.
     * Expects: { senderId, receiverId, content }
     */
    @PostMapping
    public ResponseEntity<?> sendMessage(@RequestBody Map<String, Object> request) {
        // TODO: Wire to MessageService
        return ResponseEntity.ok(Map.of("message", "Message sent successfully", "id", 1));
    }

    /**
     * PUT /api/messages/{id}/read
     * Mark a message as read.
     */
    @PutMapping("/{id}/read")
    public ResponseEntity<?> markAsRead(@PathVariable Long id) {
        // TODO: Wire to MessageService
        return ResponseEntity.ok(Map.of("message", "Message marked as read"));
    }
}
