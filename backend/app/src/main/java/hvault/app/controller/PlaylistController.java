package hvault.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/playlists")
public class PlaylistController {

    /**
     * GET /api/playlists/user/{userId}
     * Get all playlists belonging to a user.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getPlaylistsByUserId(@PathVariable Long userId) {
        // TODO: Wire to PlaylistService
        return ResponseEntity.ok(List.of(
            Map.of("id", 1, "name", "Stub Playlist", "description", "My best clips", "userId", userId)
        ));
    }

    /**
     * GET /api/playlists/{id}
     * Get a playlist with its items.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getPlaylistById(@PathVariable Long id) {
        // TODO: Wire to PlaylistService
        return ResponseEntity.ok(Map.of(
            "id", id,
            "name", "Stub Playlist",
            "description", "My best clips",
            "clips", List.of()
        ));
    }

    /**
     * POST /api/playlists
     * Create a new playlist.
     */
    @PostMapping
    public ResponseEntity<?> createPlaylist(@RequestBody Map<String, Object> request) {
        // TODO: Wire to PlaylistService
        return ResponseEntity.ok(Map.of("message", "Playlist created successfully", "id", 1));
    }

    /**
     * PUT /api/playlists/{id}
     * Update playlist info (name, description).
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePlaylist(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        // TODO: Wire to PlaylistService
        return ResponseEntity.ok(Map.of("message", "Playlist updated successfully"));
    }

    /**
     * DELETE /api/playlists/{id}
     * Delete a playlist.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePlaylist(@PathVariable Long id) {
        // TODO: Wire to PlaylistService
        return ResponseEntity.ok(Map.of("message", "Playlist deleted successfully"));
    }

    /**
     * POST /api/playlists/{id}/clips/{clipId}
     * Add a clip to a playlist.
     */
    @PostMapping("/{id}/clips/{clipId}")
    public ResponseEntity<?> addClipToPlaylist(@PathVariable Long id, @PathVariable Long clipId) {
        // TODO: Wire to PlaylistService
        return ResponseEntity.ok(Map.of("message", "Clip added to playlist"));
    }

    /**
     * DELETE /api/playlists/{id}/clips/{clipId}
     * Remove a clip from a playlist.
     */
    @DeleteMapping("/{id}/clips/{clipId}")
    public ResponseEntity<?> removeClipFromPlaylist(@PathVariable Long id, @PathVariable Long clipId) {
        // TODO: Wire to PlaylistService
        return ResponseEntity.ok(Map.of("message", "Clip removed from playlist"));
    }
}
