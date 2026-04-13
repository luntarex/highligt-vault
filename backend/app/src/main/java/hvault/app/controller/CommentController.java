package hvault.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    private final hvault.app.service.CommentService commentService;

    public CommentController(hvault.app.service.CommentService commentService) {
        this.commentService = commentService;
    }

    /**
     * GET /api/comments/post/{postId}
     * Get all comments for a specific post.
     */
    @GetMapping("/post/{postId}")
    public ResponseEntity<?> getCommentsByPostId(@PathVariable Long postId) {
        // TODO: Wire to CommentService
        return ResponseEntity.ok(List.of(
            Map.of("id", 1, "content", "Stub comment", "userId", 2, "postId", postId)
        ));
    }

    /**
     * GET /api/comments/user/{userId}
     * Get all comments made by a specific user.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getCommentsByUserId(@PathVariable Long userId) {
        // TODO: Wire to CommentService
        return ResponseEntity.ok(List.of(
            Map.of("id", 1, "content", "Stub comment by user", "userId", userId, "postId", 1)
        ));
    }

    /**
     * POST /api/comments
     * Add a new comment to a post.
     * Expects: { postId, userId, content, parentCommentId? }
     */
    @PostMapping
    public ResponseEntity<?> addComment(@RequestBody Map<String, Object> request) {
        // TODO: Wire to CommentService
        return ResponseEntity.ok(Map.of("message", "Comment added successfully", "id", 1));
    }

    /**
     * PUT /api/comments/{id}
     * Edit the text of a comment.
     * REQUIREMENT #3: UPDATE query — change an existing value
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateComment(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        String newContent = (String) request.get("content");
        commentService.updateCommentContent(id, newContent);
        return ResponseEntity.ok(Map.of("message", "Comment updated successfully"));
    }

    /**
     * DELETE /api/comments/{id}
     * Remove a comment from the system for violating terms of service.
     * REQUIREMENT #5: DELETE query — remove a row of data
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteComment(@PathVariable Long id) {
        commentService.deleteCommentViolation(id);
        return ResponseEntity.ok(Map.of("message", "Comment removed for TOS violation"));
    }
}
