package hvault.app.controller;

import java.util.List;
import java.util.Map;

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

import hvault.app.dto.ClipCreateRequest;
import hvault.app.dto.ClipResponse;
import hvault.app.dto.ClipUpdateRequest;
import hvault.app.security.JwtService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/clips")
public class ClipController {

    private final hvault.app.service.ClipService clipService;

    public ClipController(hvault.app.service.ClipService clipService) {
        this.clipService = clipService;
    }

    /**
     * GET /api/clips
     * Get all clips for the current user.
     */
    @GetMapping
    public ResponseEntity<?> getAllClips(@RequestParam(required = false) Long uploaderId) {
        if (uploaderId != null) {
            return ResponseEntity.ok(clipService.getClipsByUserId(uploaderId));
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
    public ResponseEntity<?> getFavoritesByUserId(@PathVariable Long userId) {
        List<ClipResponse> clips = clipService.getFavoritesByUserId(userId);
        return ResponseEntity.ok(clips);
    }

    /**
     * POST /api/clips/{id}/favorite?userId={userId}
     */
    @PostMapping("/{id}/favorite")
    public ResponseEntity<?> addFavorite(@PathVariable Long id, @RequestParam Long userId) {
        try {
            clipService.addFavorite(userId, id);
            return ResponseEntity.ok(Map.of("message", "Clip favorited"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * DELETE /api/clips/{id}/favorite?userId={userId}
     */
    @DeleteMapping("/{id}/favorite")
    public ResponseEntity<?> removeFavorite(@PathVariable Long id, @RequestParam Long userId) {
        try {
            clipService.removeFavorite(userId, id);
            return ResponseEntity.ok(Map.of("message", "Clip unfavorited"));
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/clips
     * Create a new clip.
     */
    @PostMapping
    public ResponseEntity<?> createClip(@Valid @RequestBody ClipCreateRequest request, Authentication authentication) {
        try {
            Long currentUserId = getCurrentUserId(authentication);
            if (currentUserId != null) {
                request.setUploaderId(currentUserId);
            }
            clipService.createClip(request);
            return ResponseEntity.ok(Map.of("message", "Clip created successfully"));
        } catch (Exception e) {
            System.err.println("Database error creating clip: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * PUT /api/clips/{id}
     * Update an existing clip.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateClip(@PathVariable Long id, @Valid @RequestBody ClipUpdateRequest request) {
        try {
            clipService.updateClip(id, request);
            return ResponseEntity.ok(Map.of("message", "Clip updated successfully"));
        } catch (Exception e) {
            System.err.println("Database error updating clip: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * DELETE /api/clips/{id}
     * Soft-delete a clip (sets is_deleted = 1).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteClip(@PathVariable Long id) {
        try {
            clipService.deleteClip(id);
            return ResponseEntity.ok(Map.of("message", "Clip soft-deleted successfully"));
        } catch (Exception e) {
            System.err.println("Database error deleting clip: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * DELETE /api/clips/trash/{id}/hard
     * Hard-delete a clip completely from the database.
     */
    @DeleteMapping("/trash/{id}/hard")
    public ResponseEntity<?> hardDeleteClip(@PathVariable Long id) {
        try {
            clipService.hardDeleteClip(id);
            return ResponseEntity.ok(Map.of("message", "Clip permanently deleted"));
        } catch (Exception e) {
            System.err.println("Database error hard-deleting clip: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    @GetMapping("/trash")
    public ResponseEntity<?> getDeletedClips(@RequestParam Long uploaderId) {
        return ResponseEntity.ok(clipService.getDeletedClipsByUserId(uploaderId));
    }

    @PutMapping("/trash/recover/{id}")
    public ResponseEntity<?> recoverClip(@PathVariable Long id) {
        try {
            clipService.recoverClip(id);
            return ResponseEntity.ok(Map.of("message", "Clip recovered successfully"));
        } catch (Exception e) {
            System.err.println("Database error recovering clip: " + e.getMessage());
            e.printStackTrace();
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }

    private Long getCurrentUserId(Authentication authentication) {
        if (authentication != null && authentication.getDetails() instanceof JwtService.JwtClaims claims) {
            return claims.userId();
        }
        return null;
    }
}
