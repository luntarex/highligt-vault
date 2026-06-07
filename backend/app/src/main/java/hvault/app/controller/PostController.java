package hvault.app.controller;

import hvault.app.dto.ApiMessageResponse;
import hvault.app.dto.CreatePostRequest;
import hvault.app.dto.CreatePostResponse;
import hvault.app.dto.PostFeedResponse;
import hvault.app.dto.UpdatePostRequest;
import hvault.app.security.SecurityUtil;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final hvault.app.service.PostService postService;

    public PostController(hvault.app.service.PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public ResponseEntity<?> getAllPosts(@RequestParam(required = false) Long userId, Authentication authentication) {
        return ResponseEntity.ok(postService.getAllPostsForUser(SecurityUtil.requireCurrentUserId(authentication)));
    }

    @GetMapping("/following")
    public ResponseEntity<?> getFollowingFeed(@RequestParam(required = false) Long userId, Authentication authentication) {
        return ResponseEntity.ok(postService.getFollowingFeed(SecurityUtil.requireCurrentUserId(authentication)));
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getUserPosts(@PathVariable Long userId, Authentication authentication) {
        return ResponseEntity.ok(postService.getUserPosts(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPostById(@PathVariable Long id, Authentication authentication) {
        PostFeedResponse post = postService.getPostById(id, SecurityUtil.currentUserId(authentication));
        return post == null ? ResponseEntity.notFound().build() : ResponseEntity.ok(post);
    }

    @PostMapping
    public ResponseEntity<CreatePostResponse> createPost(@Valid @RequestBody CreatePostRequest request, Authentication authentication) {
        CreatePostResponse response = postService.createPost(
            SecurityUtil.requireCurrentUserId(authentication),
            request.getClipId(),
            request.getCaption(),
            SecurityUtil.isAdmin(authentication)
        );
        return ResponseEntity.ok(response);
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> updatePost(
        @PathVariable Long id,
        @RequestBody UpdatePostRequest request,
        Authentication authentication
    ) {
        postService.updatePostCaption(
            id,
            request.getCaption(),
            SecurityUtil.requireCurrentUserId(authentication),
            SecurityUtil.isAdmin(authentication)
        );
        return ResponseEntity.ok(new ApiMessageResponse("Post updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> deletePost(@PathVariable Long id, Authentication authentication) {
        postService.deletePost(id, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Post deleted successfully"));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<ApiMessageResponse> likePost(
        @PathVariable Long id,
        @RequestParam(required = false) Long userId,
        Authentication authentication
    ) {
        postService.likePost(id, SecurityUtil.requireCurrentUserId(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Post liked"));
    }

    @DeleteMapping("/{id}/like")
    public ResponseEntity<ApiMessageResponse> unlikePost(
        @PathVariable Long id,
        @RequestParam(required = false) Long userId,
        Authentication authentication
    ) {
        postService.unlikePost(id, SecurityUtil.requireCurrentUserId(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Post unliked"));
    }

    @GetMapping("/clip/{clipId}")
    public ResponseEntity<?> getPostByClipId(
        @PathVariable Long clipId,
        @RequestParam(required = false) Long userId,
        Authentication authentication
    ) {
        PostFeedResponse post = postService.getPostByClipId(clipId, SecurityUtil.currentUserId(authentication));
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(post);
    }
}
