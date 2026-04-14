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
     */
    @GetMapping
    public ResponseEntity<?> getAllPosts() {
        return ResponseEntity.ok(postService.getAllPosts());
    }

    /**
     * GET /api/posts/{id}
     * Get a single post by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getPostById(@PathVariable Long id) {
        // TODO: Wire to PostService
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
        // TODO: Wire to PostService
        return ResponseEntity.ok(Map.of("message", "Post deleted successfully"));
    }

    /**
     * POST /api/posts/{id}/like
     * Like a post.
     */
    @PostMapping("/{id}/like")
    public ResponseEntity<?> likePost(@PathVariable Long id, @RequestParam Long userId) {
        // TODO: Wire to PostService
        return ResponseEntity.ok(Map.of("message", "Post liked"));
    }

    /**
     * DELETE /api/posts/{id}/like
     * Unlike a post.
     */
    @DeleteMapping("/{id}/like")
    public ResponseEntity<?> unlikePost(@PathVariable Long id, @RequestParam Long userId) {
        // TODO: Wire to PostService
        return ResponseEntity.ok(Map.of("message", "Post unliked"));
    }
}
