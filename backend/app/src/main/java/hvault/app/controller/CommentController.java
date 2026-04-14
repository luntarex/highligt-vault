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
        return ResponseEntity.ok(commentService.getCommentsByPostId(postId));
    }

    /**
     * GET /api/comments/user/{userId}
     * Get all comments made by a specific user.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getCommentsByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(commentService.getCommentsByUserId(userId));
    }

    /**
     * POST /api/comments
     * Add a new comment to a post.
     * Expects: { postId, userId, content, parentCommentId? }
     */
    @PostMapping
    public ResponseEntity<?> addComment(@RequestBody Map<String, Object> request) {
        Long postId = Long.valueOf(request.get("postId").toString());
        Long userId = Long.valueOf(request.get("userId").toString());
        String content = (String) request.get("content");
        Long parentCommentId = request.get("parentCommentId") != null
            ? Long.valueOf(request.get("parentCommentId").toString())
            : null;

        Long id = commentService.addComment(postId, userId, content, parentCommentId);
        return ResponseEntity.ok(Map.of("message", "Comment added successfully", "id", id));
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
