package hvault.app.service;

import hvault.app.repository.PlaylistRepository;
import org.springframework.stereotype.Service;

import java.util.HashMap;
import java.util.List;
import java.util.Map;

@Service
public class PlaylistService {

    private final PlaylistRepository playlistRepository;

    public PlaylistService(PlaylistRepository playlistRepository) {
        this.playlistRepository = playlistRepository;
    }

    public List<Map<String, Object>> getPlaylistsByUserId(Long userId) {
        return playlistRepository.findPlaylistsByUserId(userId);
    }

    public Map<String, Object> getPlaylistById(Long id) {
        Map<String, Object> playlist = playlistRepository.findPlaylistById(id);
        if (playlist == null) {
            throw new IllegalArgumentException("Playlist not found");
        }
        
        List<Map<String, Object>> clips = playlistRepository.findClipsByPlaylistId(id);
        
        Map<String, Object> response = new HashMap<>(playlist);
        response.put("clips", clips);
        
        return response;
    }

    public Long createPlaylist(Long userId, String name, String description) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Playlist name cannot be empty");
        }
        return playlistRepository.createPlaylist(userId, name, description);
    }

    public void updatePlaylist(Long id, String name, String description) {
        Map<String, Object> playlist = playlistRepository.findPlaylistById(id);
        if (playlist == null) {
            throw new IllegalArgumentException("Playlist not found");
        }
        playlistRepository.updatePlaylist(id, name, description);
    }

    public void deletePlaylist(Long id) {
        playlistRepository.deletePlaylist(id);
    }

    public void addClipToPlaylist(Long playlistId, Long clipId) {
        Map<String, Object> playlist = playlistRepository.findPlaylistById(playlistId);
        if (playlist == null) {
            throw new IllegalArgumentException("Playlist not found");
        }
        playlistRepository.addClipToPlaylist(playlistId, clipId);
    }

    public void removeClipFromPlaylist(Long playlistId, Long clipId) {
        playlistRepository.removeClipFromPlaylist(playlistId, clipId);
    }
}
