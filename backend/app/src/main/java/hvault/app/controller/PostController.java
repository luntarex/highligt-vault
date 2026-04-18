package hvault.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/posts")
public class PostController {

    private final hvault.app.service.PostService postService;

    public PostController(hvault.app.service.PostService postService) {
        this.postService = postService;
    }

    /**
     * GET /api/posts
     * Get explore feed — all public posts.
     * Optionally pass ?userId= to include isLiked per post.
     */
    @GetMapping
    public ResponseEntity<?> getAllPosts(@RequestParam(required = false) Long userId) {
        if (userId != null) {
            return ResponseEntity.ok(postService.getAllPostsForUser(userId));
        }
        return ResponseEntity.ok(postService.getAllPosts());
    }

    /**
     * GET /api/posts/following
     * Get feed of posts from users the current user follows.
     */
    @GetMapping("/following")
    public ResponseEntity<?> getFollowingFeed(@RequestParam Long userId) {
        return ResponseEntity.ok(postService.getFollowingFeed(userId));
    }

    /**
     * GET /api/posts/{id}
     * Get a single post by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getPostById(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of(
                "id", id,
                "caption", "Stub post caption",
                "userId", 1,
                "clipId", 1));
    }

    /**
     * POST /api/posts
     * Add a new post.
     * REQUIREMENT #4: INSERT query — add a row of data
     */
    @PostMapping
    public ResponseEntity<?> createPost(@RequestBody Map<String, Object> request) {
        Long userId = Long.valueOf(request.get("userId").toString());
        Long clipId = Long.valueOf(request.get("clipId").toString());
        String caption = (String) request.get("caption");

        Long id = postService.createPost(userId, clipId, caption);
        return ResponseEntity.ok(Map.of("message", "Post created successfully", "id", id));
    }

    /**
     * PUT /api/posts/{id}
     * Edit the caption of a post.
     * REQUIREMENT #3: UPDATE query — change an existing value
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePost(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        String caption = (String) request.get("caption");
        postService.updatePostCaption(id, caption);
        return ResponseEntity.ok(Map.of("message", "Post updated successfully"));
    }

    /**
     * DELETE /api/posts/{id}
     * Delete a post.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePost(@PathVariable Long id) {
        return ResponseEntity.ok(Map.of("message", "Post deleted successfully"));
    }

    /**
     * POST /api/posts/{id}/like
     * Like a post.
     */
    @PostMapping("/{id}/like")
    public ResponseEntity<?> likePost(@PathVariable Long id, @RequestParam Long userId) {
        postService.likePost(id, userId);
        return ResponseEntity.ok(Map.of("message", "Post liked"));
    }

    /**
     * DELETE /api/posts/{id}/like
     * Unlike a post.
     */
    @DeleteMapping("/{id}/like")
    public ResponseEntity<?> unlikePost(@PathVariable Long id, @RequestParam Long userId) {
        postService.unlikePost(id, userId);
        return ResponseEntity.ok(Map.of("message", "Post unliked"));
    }

    /**
     * GET /api/posts/clip/{clipId}
     * Get post details by clip ID.
     */
    @GetMapping("/clip/{clipId}")
    public ResponseEntity<?> getPostByClipId(@PathVariable Long clipId, @RequestParam(required = false) Long userId) {
        Map<String, Object> post = postService.getPostByClipId(clipId, userId);
        if (post == null) {
            return ResponseEntity.notFound().build();
        }
        return ResponseEntity.ok(post);
    }
}
