package hvault.app.controller;

import hvault.app.dto.ApiMessageResponse;
import hvault.app.security.SecurityUtil;
import org.springframework.security.core.Authentication;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<ApiMessageResponse> followUser(
        @PathVariable Long userId,
        @RequestParam(required = false) Long followerId,
        Authentication authentication
    ) {
        userService.followUser(SecurityUtil.requireCurrentUserId(authentication), userId);
        return ResponseEntity.ok(new ApiMessageResponse("Followed user successfully"));
    }

    /**
     * DELETE /api/follows/{userId}
     * Unfollow a user.
     */
    @DeleteMapping("/{userId}")
    public ResponseEntity<ApiMessageResponse> unfollowUser(
        @PathVariable Long userId,
        @RequestParam(required = false) Long followerId,
        Authentication authentication
    ) {
        userService.unfollowUser(SecurityUtil.requireCurrentUserId(authentication), userId);
        return ResponseEntity.ok(new ApiMessageResponse("Unfollowed user successfully"));
    }

    /**
     * GET /api/follows/{userId}/is-following
     * Check if a user is following another user.
     */
    @GetMapping("/{userId}/is-following")
    public ResponseEntity<Map<String, Boolean>> isFollowing(
        @PathVariable Long userId,
        @RequestParam(required = false) Long followerId,
        Authentication authentication
    ) {
        boolean following = userService.isFollowing(SecurityUtil.requireCurrentUserId(authentication), userId);
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

    /**
     * GET /api/follows/{userId}/suggestions
     * Get suggested users to follow based on who your friends follow.
     */
    @GetMapping("/{userId}/suggestions")
    public ResponseEntity<?> getSuggestedUsers(@PathVariable Long userId, Authentication authentication) {
        return ResponseEntity.ok(userService.getSuggestedUsers(SecurityUtil.requireCurrentUserId(authentication)));
    }
}
