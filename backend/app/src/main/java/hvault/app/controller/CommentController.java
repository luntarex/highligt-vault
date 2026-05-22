package hvault.app.controller;

import hvault.app.dto.ApiMessageResponse;
import hvault.app.dto.CreateCommentRequest;
import hvault.app.dto.IdMessageResponse;
import hvault.app.dto.UpdateCommentRequest;
import hvault.app.security.SecurityUtil;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<IdMessageResponse> addComment(@Valid @RequestBody CreateCommentRequest request, Authentication authentication) {
        Long id = commentService.addComment(
            request.getPostId(),
            SecurityUtil.requireCurrentUserId(authentication),
            request.getContent(),
            request.getParentCommentId()
        );
        return ResponseEntity.ok(new IdMessageResponse("Comment added successfully", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> updateComment(
        @PathVariable Long id,
        @Valid @RequestBody UpdateCommentRequest request,
        Authentication authentication
    ) {
        commentService.updateCommentContent(id, request.getContent(), SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Comment updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> deleteComment(@PathVariable Long id, Authentication authentication) {
        commentService.deleteComment(id, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Comment deleted successfully"));
    }

    @DeleteMapping("/{id}/violation")
    public ResponseEntity<ApiMessageResponse> deleteCommentViolation(@PathVariable Long id, Authentication authentication) {
        commentService.deleteCommentViolation(id, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Comment removed and archived for TOS violation"));
    }
}
