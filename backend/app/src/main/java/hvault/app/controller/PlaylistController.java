package hvault.app.controller;

import hvault.app.service.PlaylistService;
import hvault.app.dto.PlaylistResponse;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/playlists")
public class PlaylistController {

    private final PlaylistService playlistService;

    public PlaylistController(PlaylistService playlistService) {
        this.playlistService = playlistService;
    }

    /**
     * GET /api/playlists/user/{userId}
     * Get all playlists belonging to a user.
     */
    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getPlaylistsByUserId(@PathVariable Long userId) {
        try {
            List<PlaylistResponse> playlists = playlistService.getPlaylistsByUserId(userId);
            return ResponseEntity.ok(playlists);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/playlists/{id}
     * Get a playlist with its items.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getPlaylistById(@PathVariable Long id) {
        try {
            PlaylistResponse playlist = playlistService.getPlaylistById(id);
            return ResponseEntity.ok(playlist);
        } catch (IllegalArgumentException e) {
            return ResponseEntity.notFound().build();
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/playlists
     * Create a new playlist.
     */
    @PostMapping
    public ResponseEntity<?> createPlaylist(@RequestBody Map<String, Object> request) {
        try {
            Long userId = Long.valueOf(request.get("userId").toString());
            String name = (String) request.get("name");
            String description = (String) request.get("description");
            
            Long id = playlistService.createPlaylist(userId, name, description);
            return ResponseEntity.ok(Map.of("message", "Playlist created successfully", "id", id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * PUT /api/playlists/{id}
     * Update playlist info (name, description).
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updatePlaylist(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        try {
            String name = (String) request.get("name");
            String description = (String) request.get("description");
            
            playlistService.updatePlaylist(id, name, description);
            return ResponseEntity.ok(Map.of("message", "Playlist updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * DELETE /api/playlists/{id}
     * Delete a playlist.
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePlaylist(@PathVariable Long id) {
        try {
            playlistService.deletePlaylist(id);
            return ResponseEntity.ok(Map.of("message", "Playlist deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * POST /api/playlists/{id}/clips/{clipId}
     * Add a clip to a playlist.
     */
    @PostMapping("/{id}/clips/{clipId}")
    public ResponseEntity<?> addClipToPlaylist(@PathVariable Long id, @PathVariable Long clipId) {
        try {
            playlistService.addClipToPlaylist(id, clipId);
            return ResponseEntity.ok(Map.of("message", "Clip added to playlist"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * DELETE /api/playlists/{id}/clips/{clipId}
     * Remove a clip from a playlist.
     */
    @DeleteMapping("/{id}/clips/{clipId}")
    public ResponseEntity<?> removeClipFromPlaylist(@PathVariable Long id, @PathVariable Long clipId) {
        try {
            playlistService.removeClipFromPlaylist(id, clipId);
            return ResponseEntity.ok(Map.of("message", "Clip removed from playlist"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }
}
