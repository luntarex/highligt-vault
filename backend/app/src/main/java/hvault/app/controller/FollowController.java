package hvault.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/follows")
public class FollowController {

    private final hvault.app.service.UserService userService;

    public FollowController(hvault.app.service.UserService userService) {
        this.userService = userService;
    }

    /**
     * POST /api/follows/{userId}
     * Follow a user.
     */
    @PostMapping("/{userId}")
    public ResponseEntity<?> followUser(@PathVariable Long userId, @RequestParam Long followerId) {
        userService.followUser(followerId, userId);
        return ResponseEntity.ok(Map.of("message", "Followed user successfully"));
    }

    /**
     * DELETE /api/follows/{userId}
     * Unfollow a user.
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<?> unfollowUser(@PathVariable Long userId, @RequestParam Long followerId) {
        userService.unfollowUser(followerId, userId);
        return ResponseEntity.ok(Map.of("message", "Unfollowed user successfully"));
    }

    /**
     * GET /api/follows/{userId}/is-following
     * Check if a user is following another user.
     */
    @GetMapping("/{userId}/is-following")
    public ResponseEntity<Map<String, Boolean>> isFollowing(@PathVariable Long userId, @RequestParam Long followerId) {
        boolean following = userService.isFollowing(followerId, userId);
        return ResponseEntity.ok(Map.of("isFollowing", following));
    }

    /**
     * GET /api/follows/{userId}/followers
     * Get all followers of a user.
     */
    @GetMapping("/{userId}/followers")
    public ResponseEntity<?> getFollowers(@PathVariable Long userId) {
        return ResponseEntity.ok(userService.getFollowers(userId));
    }

    /**
     * GET /api/follows/{userId}/following
     * Get all users that a user is following.
     */
    @GetMapping("/{userId}/following")
    public ResponseEntity<?> getFollowing(@PathVariable Long userId) {
        return ResponseEntity.ok(userService.getFollowing(userId));
    }
}
