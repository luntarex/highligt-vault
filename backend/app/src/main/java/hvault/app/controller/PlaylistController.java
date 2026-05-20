package hvault.app.controller;

import hvault.app.dto.CreatePlaylistRequest;
import hvault.app.dto.PlaylistResponse;
import hvault.app.dto.UpdatePlaylistRequest;
import hvault.app.service.PlaylistService;
import jakarta.validation.Valid;
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

    @GetMapping("/user/{userId}")
    public ResponseEntity<?> getPlaylistsByUserId(@PathVariable Long userId) {
        try {
            List<PlaylistResponse> playlists = playlistService.getPlaylistsByUserId(userId);
            return ResponseEntity.ok(playlists);
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

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

    @PostMapping
    public ResponseEntity<?> createPlaylist(@Valid @RequestBody CreatePlaylistRequest request) {
        try {
            Long id = playlistService.createPlaylist(request.getUserId(), request.getName(), request.getDescription());
            return ResponseEntity.ok(Map.of("message", "Playlist created successfully", "id", id));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updatePlaylist(@PathVariable Long id, @RequestBody UpdatePlaylistRequest request) {
        try {
            playlistService.updatePlaylist(id, request.getName(), request.getDescription());
            return ResponseEntity.ok(Map.of("message", "Playlist updated successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deletePlaylist(@PathVariable Long id) {
        try {
            playlistService.deletePlaylist(id);
            return ResponseEntity.ok(Map.of("message", "Playlist deleted successfully"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    @PostMapping("/{id}/clips/{clipId}")
    public ResponseEntity<?> addClipToPlaylist(@PathVariable Long id, @PathVariable Long clipId) {
        try {
            playlistService.addClipToPlaylist(id, clipId);
            return ResponseEntity.ok(Map.of("message", "Clip added to playlist"));
        } catch (Exception e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

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
