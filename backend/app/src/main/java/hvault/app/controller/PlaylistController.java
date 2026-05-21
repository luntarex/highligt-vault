package hvault.app.controller;

import hvault.app.dto.ApiMessageResponse;
import hvault.app.dto.CreatePlaylistRequest;
import hvault.app.dto.IdMessageResponse;
import hvault.app.dto.PlaylistResponse;
import hvault.app.dto.UpdatePlaylistRequest;
import hvault.app.security.SecurityUtil;
import hvault.app.service.PlaylistService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/playlists")
public class PlaylistController {

    private final PlaylistService playlistService;

    public PlaylistController(PlaylistService playlistService) {
        this.playlistService = playlistService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<PlaylistResponse>> getPlaylistsByUserId(@PathVariable Long userId, Authentication authentication) {
        Long currentUserId = SecurityUtil.requireCurrentUserId(authentication);
        Long targetUserId = SecurityUtil.isAdmin(authentication) ? userId : currentUserId;
        List<PlaylistResponse> playlists = playlistService.getPlaylistsByUserId(targetUserId);
        return ResponseEntity.ok(playlists);
    }

    @GetMapping("/{id}")
    public ResponseEntity<PlaylistResponse> getPlaylistById(@PathVariable Long id, Authentication authentication) {
        PlaylistResponse playlist = playlistService.getPlaylistById(
            id,
            SecurityUtil.requireCurrentUserId(authentication),
            SecurityUtil.isAdmin(authentication)
        );
        return ResponseEntity.ok(playlist);
    }

    @PostMapping
    public ResponseEntity<IdMessageResponse> createPlaylist(@Valid @RequestBody CreatePlaylistRequest request, Authentication authentication) {
        Long id = playlistService.createPlaylist(
            SecurityUtil.requireCurrentUserId(authentication),
            request.getName(),
            request.getDescription()
        );
        return ResponseEntity.ok(new IdMessageResponse("Playlist created successfully", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> updatePlaylist(
        @PathVariable Long id,
        @RequestBody UpdatePlaylistRequest request,
        Authentication authentication
    ) {
        playlistService.updatePlaylist(
            id,
            request.getName(),
            request.getDescription(),
            SecurityUtil.requireCurrentUserId(authentication),
            SecurityUtil.isAdmin(authentication)
        );
        return ResponseEntity.ok(new ApiMessageResponse("Playlist updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> deletePlaylist(@PathVariable Long id, Authentication authentication) {
        playlistService.deletePlaylist(id, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Playlist deleted successfully"));
    }

    @PostMapping("/{id}/clips/{clipId}")
    public ResponseEntity<ApiMessageResponse> addClipToPlaylist(
        @PathVariable Long id,
        @PathVariable Long clipId,
        Authentication authentication
    ) {
        playlistService.addClipToPlaylist(id, clipId, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Clip added to playlist"));
    }

    @DeleteMapping("/{id}/clips/{clipId}")
    public ResponseEntity<ApiMessageResponse> removeClipFromPlaylist(
        @PathVariable Long id,
        @PathVariable Long clipId,
        Authentication authentication
    ) {
        playlistService.removeClipFromPlaylist(id, clipId, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Clip removed from playlist"));
    }
}
