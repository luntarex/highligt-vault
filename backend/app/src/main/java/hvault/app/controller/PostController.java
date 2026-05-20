package hvault.app.controller;

import hvault.app.dto.CreatePostRequest;
import hvault.app.dto.PostFeedResponse;
import hvault.app.dto.UpdatePostRequest;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final hvault.app.service.PostService postService;

    public PostController(hvault.app.service.PostService postService) {
        this.postService = postService;
    }

    @GetMapping
    public ResponseEntity<?> getAllPosts(@RequestParam(required = false) Long userId) {
        if (userId != null) {
            return ResponseEntity.ok(postService.getAllPostsForUser(userId));
        }
        return ResponseEntity.ok(postService.getAllPosts());
    }

    @GetMapping("/following")
    public ResponseEntity<?> getFollowingFeed(@RequestParam Long userId) {
        return ResponseEntity.ok(postService.getFollowingFeed(userId));
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getPostById(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of(
                "id", id,
                "caption", "Stub post caption",
                "userId", 1,
                "clipId", 1));
    }

    @PostMapping
    public ResponseEntity<?> createPost(@Valid @RequestBody CreatePostRequest request) {
        Long id = postService.createPost(request.getUserId(), request.getClipId(), request.getCaption());
        return ResponseEntity.ok(Map.of("message", "Post created successfully", "id", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePost(@PathVariable Long id, @RequestBody UpdatePostRequest request) {
        postService.updatePostCaption(id, request.getCaption());
        return ResponseEntity.ok(Map.of("message", "Post updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePost(@PathVariable Long id) {
        postService.deletePost(id);
        return ResponseEntity.ok(Map.of("message", "Post deleted successfully"));
    }

    @PostMapping("/{id}/like")
    public ResponseEntity<?> likePost(@PathVariable Long id, @RequestParam Long userId) {
        postService.likePost(id, userId);
        return ResponseEntity.ok(Map.of("message", "Post liked"));
    }

    @DeleteMapping("/{id}/like")
    public ResponseEntity<?> unlikePost(@PathVariable Long id, @RequestParam Long userId) {
        postService.unlikePost(id, userId);
        return ResponseEntity.ok(Map.of("message", "Post unliked"));
    }

    @GetMapping("/clip/{clipId}")
    public ResponseEntity<?> getPostByClipId(@PathVariable Long clipId, @RequestParam(required = false) Long userId) {
        PostFeedResponse post = postService.getPostByClipId(clipId, userId);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(post);
    }
}
