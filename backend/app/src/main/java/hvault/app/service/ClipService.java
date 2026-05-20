package hvault.app.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import hvault.app.dto.ClipCreateRequest;
import hvault.app.dto.ClipResponse;
import hvault.app.dto.ClipUpdateRequest;
import hvault.app.entity.Clip;
import hvault.app.entity.Game;
import hvault.app.enums.ModerationStatus;
import hvault.app.enums.VisibilityStatus;
import hvault.app.repository.ClipRepository;
import hvault.app.repository.GameRepository;
import hvault.app.repository.projection.ClipView;
import hvault.app.repository.projection.CommentedClipView;

@Service
public class ClipService {
    private final ClipRepository clipRepository;
    private final GameRepository gameRepository;
    private final PostService postService;

    public ClipService(ClipRepository clipRepository, GameRepository gameRepository, PostService postService) {
        this.clipRepository = clipRepository;
        this.gameRepository = gameRepository;
        this.postService = postService;
    }

    public List<ClipResponse> getClipsCommentedByUser(Long userId) {
        return clipRepository.findClipsCommentedByUser(userId).stream()
            .map(this::toClipResponse)
            .toList();
    }

    public List<ClipResponse> getClipsByUserId(Long uploaderId) {
        return clipRepository.findAllByUserId(uploaderId).stream()
            .map(this::toClipResponse)
            .toList();
    }

    public List<ClipResponse> getFavoritesByUserId(Long userId) {
        return clipRepository.findFavoritesByUserId(userId).stream()
            .map(this::toClipResponse)
            .toList();
    }

    public void addFavorite(Long userId, Long clipId) {
        clipRepository.addFavorite(userId, clipId);
    }

    public void removeFavorite(Long userId, Long clipId) {
        clipRepository.removeFavorite(userId, clipId);
    }

    public List<ClipResponse> getAllClips() {
        return clipRepository.findAllClips().stream()
            .map(this::toClipResponse)
            .toList();
    }

    public ClipResponse getClipById(Long id) {
        ClipView clip = clipRepository.findClipDetailsById(id);
        return clip == null ? null : toClipResponse(clip);
    }

    public void createClip(ClipCreateRequest clipData) {
        VisibilityStatus visibilityStatus = clipData.getVisibilityStatus() != null
            ? clipData.getVisibilityStatus()
            : VisibilityStatus.PRIVATE;

        Clip clip = new Clip();
        clip.setTitle(clipData.getTitle());
        clip.setVideoUrl(clipData.getVideoUrl());
        clip.setThumbnailUrl(clipData.getThumbnailUrl() != null
            ? clipData.getThumbnailUrl()
            : "https://images.unsplash.com/photo-1542751371-adc38448a05e?q=80&w=2070&auto=format&fit=crop");
        clip.setDuration(toFloat(clipData.getDuration(), 0.0));
        clip.setStartTime(toFloat(clipData.getStartTime(), 0.0));
        clip.setEndTime(toFloat(clipData.getEndTime(), 0.0));
        clip.setNotes(clipData.getNotes());
        clip.setUploaderId(clipData.getUploaderId() != null ? clipData.getUploaderId() : 1L);
        clip.setGameId(getGameIdByNameOrCreate(clipData.getGame()));
        clip.setIsDeleted(false);
        clip.setCreatedAt(LocalDateTime.now());
        clip.setModerationStatus(visibilityStatus == VisibilityStatus.PUBLIC ? ModerationStatus.PENDING_REVIEW : ModerationStatus.DRAFT);
        clip.setModerationScore(0);
        clip.setVisibilityStatus(visibilityStatus);

        Long clipId = clipRepository.save(clip).getId();

        List<String> tags = clipData.getTags();
        if (tags != null) {
            for (String tag : tags) {
                clipRepository.insertTagIfNotExistAndLink(clipId, tag.trim().toLowerCase());
            }
        }
    }

    public void updateClip(Long id, ClipUpdateRequest clipData) {
        Long gameId = getGameIdByNameOrCreate(clipData.getGame());
        VisibilityStatus visibilityStatus = clipData.getVisibilityStatus() != null
            ? clipData.getVisibilityStatus()
            : VisibilityStatus.PRIVATE;

        clipRepository.updateClip(id, clipData.getTitle(), clipData.getNotes(), gameId, visibilityStatus);

        if (visibilityStatus != VisibilityStatus.PUBLIC) {
            postService.deletePostsByClipId(id);
        }

        clipRepository.clearTagsForClip(id);
        List<String> tags = clipData.getTags();
        if (tags != null) {
            for (String tag : tags) {
                clipRepository.insertTagIfNotExistAndLink(id, tag.trim().toLowerCase());
            }
        }
    }

    public void deleteClip(Long id) {
        clipRepository.softDeleteClip(id);
    }

    public void hardDeleteClip(Long id) {
        clipRepository.hardDeleteClip(id);
    }

    public List<ClipResponse> getDeletedClipsByUserId(Long uploaderId) {
        return clipRepository.findAllDeletedByUserId(uploaderId).stream()
            .map(this::toClipResponse)
            .toList();
    }

    public void recoverClip(Long id) {
        clipRepository.recoverClip(id);
    }

    private Long getGameIdByNameOrCreate(String gameName) {
        if (gameName == null || gameName.trim().isEmpty()) {
            return 1L;
        }
        return gameRepository.findByName(gameName)
            .map(Game::getId)
            .orElseGet(() -> {
                Game game = new Game();
                game.setName(gameName);
                return gameRepository.save(game).getId();
            });
    }

    private ClipResponse toClipResponse(ClipView clip) {
        ClipResponse response = new ClipResponse();
        response.setId(clip.getId());
        response.setTitle(clip.getTitle());
        response.setUrl(clip.getUrl());
        response.setThumbnailUrl(clip.getThumbnailUrl());
        response.setDuration(clip.getDuration());
        response.setStartTime(clip.getStartTime());
        response.setEndTime(clip.getEndTime());
        response.setNotes(clip.getNotes());
        response.setGame(clip.getGame());
        response.setIsDeleted(Boolean.TRUE.equals(clip.getIsDeleted()));
        response.setDateCreated(clip.getDateCreated());
        response.setUploaderId(clip.getUploaderId());
        response.setTags(clipRepository.getTagsForClip(clip.getId()));
        response.setModerationStatus(parseEnum(ModerationStatus.class, clip.getModerationStatus()));
        response.setModerationScore(clip.getModerationScore());
        response.setModerationReason(clip.getModerationReason());
        response.setVisibilityStatus(parseEnum(VisibilityStatus.class, clip.getVisibilityStatus()));
        response.setRemovedReason(clip.getRemovedReason());
        return response;
    }

    private ClipResponse toClipResponse(CommentedClipView clip) {
        ClipResponse response = new ClipResponse();
        response.setId(clip.getId());
        response.setTitle(clip.getTitle());
        response.setUrl(clip.getVideoUrl());
        response.setThumbnailUrl(clip.getThumbnailUrl());
        response.setDuration(clip.getDuration());
        response.setStartTime(clip.getStartTime());
        response.setEndTime(clip.getEndTime());
        response.setGame(clip.getGameName());
        response.setTags(clipRepository.getTagsForClip(clip.getId()));
        return response;
    }

    private <T extends Enum<T>> T parseEnum(Class<T> enumType, String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return Enum.valueOf(enumType, value);
    }

    private Float toFloat(Double value, Double fallback) {
        return (value != null ? value : fallback).floatValue();
    }
}
