package hvault.app.controller;

import hvault.app.dto.ApiMessageResponse;
import hvault.app.dto.AppealClipRequest;
import hvault.app.dto.ClipCreateResponse;
import hvault.app.dto.ClipCreateRequest;
import hvault.app.dto.ClipResponse;
import hvault.app.dto.ClipUpdateRequest;
import hvault.app.enums.ModerationStatus;
import hvault.app.enums.VisibilityStatus;
import hvault.app.security.SecurityUtil;
import hvault.app.service.ClipService;
import hvault.app.service.ModerationScanResult;
import hvault.app.service.ModerationScannerService;
import jakarta.validation.Valid;
import java.util.List;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.DeleteMapping;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.PutMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/clips")
public class ClipController {
    private static final Logger logger = LoggerFactory.getLogger(ClipController.class);

    private final ClipService clipService;
    private final ModerationScannerService moderationScannerService;

    public ClipController(ClipService clipService, ModerationScannerService moderationScannerService) {
        this.clipService = clipService;
        this.moderationScannerService = moderationScannerService;
    }

    /**
     * GET /api/clips
     * Get all clips for the current user.
     */
    @GetMapping
    public ResponseEntity<?> getAllClips(@RequestParam(required = false) Long uploaderId, Authentication authentication) {
        if (uploaderId != null) {
            Long currentUserId = SecurityUtil.requireCurrentUserId(authentication);
            Long targetUserId = SecurityUtil.isAdmin(authentication) ? uploaderId : currentUserId;
            return ResponseEntity.ok(clipService.getClipsByUserId(targetUserId));
        }
        return ResponseEntity.ok(clipService.getAllClips());
    }

    /**
     * GET /api/clips/{id}
     * Get a single clip by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getClipById(@PathVariable Long id) {
        ClipResponse clip = clipService.getClipById(id);
        if (clip != null) {
            return ResponseEntity.ok(clip);
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * GET /api/clips/commented-by/{userId}
     * List all clips a certain user has commented on.
     */
    @GetMapping("/commented-by/{userId}")
    public ResponseEntity<?> getClipsCommentedByUser(@PathVariable Long userId) {
        List<ClipResponse> clips = clipService.getClipsCommentedByUser(userId);
        return ResponseEntity.ok(clips);
    }

    /**
     * GET /api/clips/favorites/{userId}
     * List all clips a user has marked as favorite.
     */
    @GetMapping("/favorites/{userId}")
    public ResponseEntity<?> getFavoritesByUserId(@PathVariable Long userId, Authentication authentication) {
        Long currentUserId = SecurityUtil.requireCurrentUserId(authentication);
        Long targetUserId = SecurityUtil.isAdmin(authentication) ? userId : currentUserId;
        List<ClipResponse> clips = clipService.getFavoritesByUserId(targetUserId);
        return ResponseEntity.ok(clips);
    }

    /**
     * POST /api/clips/{id}/favorite?userId={userId}
     */
    @PostMapping("/{id}/favorite")
    public ResponseEntity<ApiMessageResponse> addFavorite(
        @PathVariable Long id,
        @RequestParam(required = false) Long userId,
        Authentication authentication
    ) {
        clipService.addFavorite(SecurityUtil.requireCurrentUserId(authentication), id);
        return ResponseEntity.ok(new ApiMessageResponse("Clip favorited"));
    }

    /**
     * DELETE /api/clips/{id}/favorite?userId={userId}
     */
    @DeleteMapping("/{id}/favorite")
    public ResponseEntity<ApiMessageResponse> removeFavorite(
        @PathVariable Long id,
        @RequestParam(required = false) Long userId,
        Authentication authentication
    ) {
        clipService.removeFavorite(SecurityUtil.requireCurrentUserId(authentication), id);
        return ResponseEntity.ok(new ApiMessageResponse("Clip unfavorited"));
    }

    /**
     * POST /api/clips
     * Create a new clip.
     */
    @PostMapping
    public ResponseEntity<ClipCreateResponse> createClip(@Valid @RequestBody ClipCreateRequest request, Authentication authentication) {
        Long clipId = clipService.createClip(request, SecurityUtil.requireCurrentUserId(authentication));
        return ResponseEntity.ok(new ClipCreateResponse("Clip created successfully", clipId));
    }

    /**
     * PUT /api/clips/{id}
     * Update an existing clip.
     */
    @PutMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> updateClip(
        @PathVariable Long id,
        @Valid @RequestBody ClipUpdateRequest request,
        Authentication authentication
    ) {
        clipService.updateClip(id, request, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Clip updated successfully"));
    }

    /**
     * DELETE /api/clips/{id}
     * Soft-delete a clip (sets is_deleted = 1).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> deleteClip(@PathVariable Long id, Authentication authentication) {
        clipService.deleteClip(id, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Clip soft-deleted successfully"));
    }

    /**
     * DELETE /api/clips/trash/{id}/hard
     * Hard-delete a clip completely from the database.
     */
    @DeleteMapping("/trash/{id}/hard")
    public ResponseEntity<ApiMessageResponse> hardDeleteClip(@PathVariable Long id, Authentication authentication) {
        clipService.hardDeleteClip(id, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Clip permanently deleted"));
    }

    @GetMapping("/trash")
    public ResponseEntity<?> getDeletedClips(@RequestParam(required = false) Long uploaderId, Authentication authentication) {
        Long currentUserId = SecurityUtil.requireCurrentUserId(authentication);
        Long targetUserId = SecurityUtil.isAdmin(authentication) && uploaderId != null ? uploaderId : currentUserId;
        return ResponseEntity.ok(clipService.getDeletedClipsByUserId(targetUserId));
    }

    @PutMapping("/trash/recover/{id}")
    public ResponseEntity<ApiMessageResponse> recoverClip(@PathVariable Long id, Authentication authentication) {
        clipService.recoverClip(id, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Clip recovered successfully"));
    }

    @PostMapping("/scan/{id}")
    public ResponseEntity<ModerationScanResult> scanClipAfterUpload(@PathVariable Long id, Authentication authentication) {
        clipService.ensureClipOwnerOrAdmin(id, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        try {
            ModerationScanResult result = moderationScannerService.scanClipForUpload(id);
            return ResponseEntity.ok(result);
        } catch (Exception e) {
            logger.warn("Moderation scan failed for clip {}: {}", id, e.getMessage());
            return ResponseEntity.ok(new ModerationScanResult(
                ModerationStatus.NEEDS_MANUAL_REVIEW,
                VisibilityStatus.PRIVATE,
                40,
                true,
                "SCAN_UNAVAILABLE",
                "Automatic moderation could not finish. The clip was saved and may need review before sharing."
            ));
        }
    }

    @PostMapping("/{id}/appeal")
    public ResponseEntity<ApiMessageResponse> appealClip(
        @PathVariable Long id,
        @RequestBody(required = false) AppealClipRequest request,
        Authentication authentication
    ) {
        String reason = request == null ? null : request.getReason();
        clipService.appealClip(id, reason, SecurityUtil.requireCurrentUserId(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Appeal submitted for moderator review."));
    }
}
