package hvault.app.controller;

import hvault.app.dto.CreateCommentRequest;
import hvault.app.dto.UpdateCommentRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/comments")
public class CommentController {

    private final hvault.app.service.CommentService commentService;

    public CommentController(hvault.app.service.CommentService commentService) {
        this.commentService = commentService;
    }

    @GetMapping("/post/{postId}")
    public ResponseEntity<?> getCommentsByPostId(@PathVariable Long postId) {
        return ResponseEntity.ok(commentService.getCommentsByPostId(postId));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getCommentsByUserId(@PathVariable Long userId) {
        return ResponseEntity.ok(commentService.getCommentsByUserId(userId));
    }

    @PostMapping
    public ResponseEntity<?> addComment(@Valid @RequestBody CreateCommentRequest request) {
        Long id = commentService.addComment(
            request.getPostId(),
            request.getUserId(),
            request.getContent(),
            request.getParentCommentId()
        );
        return ResponseEntity.ok(Map.of("message", "Comment added successfully", "id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateComment(@PathVariable Long id, @Valid @RequestBody UpdateCommentRequest request) {
        commentService.updateCommentContent(id, request.getContent());
        return ResponseEntity.ok(Map.of("message", "Comment updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteComment(@PathVariable Long id) {
        commentService.deleteComment(id);
        return ResponseEntity.ok(Map.of("message", "Comment deleted successfully"));
    }

    @DeleteMapping("/{id}/violation")
    public ResponseEntity<?> deleteCommentViolation(@PathVariable Long id) {
        commentService.deleteCommentViolation(id);
        return ResponseEntity.ok(Map.of("message", "Comment removed and archived for TOS violation"));
    }
}
