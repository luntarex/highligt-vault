package hvault.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/follows")
public class FollowController {

    /**
     * POST /api/follows/{userId}
     * Follow a user.
     */
    @PostMapping("/{userId}")
    public ResponseEntity<?> followUser(@PathVariable Long userId, @RequestParam Long followerId) {
        // TODO: Wire to FollowService
        return ResponseEntity.ok(Map.of("message", "Followed user successfully"));
    }

    /**
     * DELETE /api/follows/{userId}
     * Unfollow a user.
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<?> unfollowUser(@PathVariable Long userId, @RequestParam Long followerId) {
        // TODO: Wire to FollowService
        return ResponseEntity.ok(Map.of("message", "Unfollowed user successfully"));
    }

    /**
     * GET /api/follows/{userId}/followers
     * Get all followers of a user.
     */
    @GetMapping("/{userId}/followers")
    public ResponseEntity<?> getFollowers(@PathVariable Long userId) {
        // TODO: Wire to FollowService
        return ResponseEntity.ok(List.of(
            Map.of("id", 2, "username", "stub_follower")
        ));
    }

    /**
     * GET /api/follows/{userId}/following
     * Get all users that a user is following.
     */
    @GetMapping("/{userId}/following")
    public ResponseEntity<?> getFollowing(@PathVariable Long userId) {
        // TODO: Wire to FollowService
        return ResponseEntity.ok(List.of(
            Map.of("id", 3, "username", "stub_following")
        ));
    }
}
