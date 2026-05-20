package hvault.app.service;

import hvault.app.dto.PlaylistClipResponse;
import hvault.app.dto.PlaylistResponse;
import hvault.app.entity.Playlist;
import hvault.app.repository.PlaylistRepository;
import hvault.app.repository.projection.PlaylistClipView;
import hvault.app.repository.projection.PlaylistView;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PlaylistService {

    private final PlaylistRepository playlistRepository;

    public PlaylistService(PlaylistRepository playlistRepository) {
        this.playlistRepository = playlistRepository;
    }

    public List<PlaylistResponse> getPlaylistsByUserId(Long userId) {
        return playlistRepository.findPlaylistsByUserId(userId).stream()
            .map(playlist -> toPlaylistResponse(playlist, null))
            .toList();
    }

    public PlaylistResponse getPlaylistById(Long id) {
        PlaylistView playlist = playlistRepository.findPlaylistById(id);
        if (playlist == null) {
            throw new IllegalArgumentException("Playlist not found");
        }

        List<PlaylistClipResponse> clips = playlistRepository.findClipsByPlaylistId(id).stream()
            .map(this::toPlaylistClipResponse)
            .toList();

        return toPlaylistResponse(playlist, clips);
    }

    public Long createPlaylist(Long userId, String name, String description) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Playlist name cannot be empty");
        }
        Playlist playlist = new Playlist();
        playlist.setUserId(userId);
        playlist.setName(name);
        playlist.setDescription(description);
        playlist.setCreatedAt(LocalDateTime.now());
        return playlistRepository.save(playlist).getId();
    }

    public void updatePlaylist(Long id, String name, String description) {
        PlaylistView playlist = playlistRepository.findPlaylistById(id);
        if (playlist == null) {
            throw new IllegalArgumentException("Playlist not found");
        }
        playlistRepository.updatePlaylist(id, name, description);
    }

    public void deletePlaylist(Long id) {
        playlistRepository.deletePlaylist(id);
    }

    public void addClipToPlaylist(Long playlistId, Long clipId) {
        PlaylistView playlist = playlistRepository.findPlaylistById(playlistId);
        if (playlist == null) {
            throw new IllegalArgumentException("Playlist not found");
        }
        playlistRepository.addClipToPlaylist(playlistId, clipId);
    }

    public void removeClipFromPlaylist(Long playlistId, Long clipId) {
        playlistRepository.removeClipFromPlaylist(playlistId, clipId);
    }

    private PlaylistResponse toPlaylistResponse(PlaylistView playlist, List<PlaylistClipResponse> clips) {
        PlaylistResponse response = new PlaylistResponse();
        response.setId(playlist.getId());
        response.setName(playlist.getName());
        response.setDescription(playlist.getDescription());
        response.setUserId(playlist.getUserId());
        response.setCreatedAt(playlist.getCreatedAt());
        response.setClips(clips);
        return response;
    }

    private PlaylistClipResponse toPlaylistClipResponse(PlaylistClipView clip) {
        PlaylistClipResponse response = new PlaylistClipResponse();
        response.setId(clip.getId());
        response.setTitle(clip.getTitle());
        response.setUrl(clip.getUrl());
        response.setThumbnailUrl(clip.getThumbnailUrl());
        response.setDuration(clip.getDuration());
        response.setStartTime(clip.getStartTime());
        response.setEndTime(clip.getEndTime());
        response.setNotes(clip.getNotes());
        response.setGame(clip.getGame());
        response.setAddedAt(clip.getAddedAt());
        return response;
    }
}
