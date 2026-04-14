package hvault.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

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
        Map<String, Object> clip = clipService.getClipById(id);
        if (clip != null) {
            return ResponseEntity.ok(clip);
        }
        return ResponseEntity.notFound().build();
    }

    /**
     * GET /api/clips/commented-by/{userId}
     * List all clips a certain user has commented on.
     * REQUIREMENT #1: JOIN query — linking tables (comments → posts → clips)
     */
    @GetMapping("/commented-by/{userId}")
    public ResponseEntity<?> getClipsCommentedByUser(@PathVariable Long userId) {
        List<Map<String, Object>> clips = clipService.getClipsCommentedByUser(userId);
        return ResponseEntity.ok(clips);
    }

    /**
     * GET /api/clips/favorites/{userId}
     * List all clips a user has marked as favorite.
     */
    @GetMapping("/favorites/{userId}")
    public ResponseEntity<?> getFavoritesByUserId(@PathVariable Long userId) {
        List<Map<String, Object>> clips = clipService.getFavoritesByUserId(userId);
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
    public ResponseEntity<?> createClip(@RequestBody Map<String, Object> request) {
        try {
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
    public ResponseEntity<?> updateClip(@PathVariable Long id, @RequestBody Map<String, Object> request) {
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
}
