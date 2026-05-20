package hvault.app.service;

import java.time.LocalDateTime;
import java.util.HashMap;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import hvault.app.dto.ClipCreateRequest;
import hvault.app.dto.ClipUpdateRequest;
import hvault.app.entity.Clip;
import hvault.app.entity.Game;
import hvault.app.enums.ModerationStatus;
import hvault.app.enums.VisibilityStatus;
import hvault.app.repository.ClipRepository;
import hvault.app.repository.GameRepository;

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

    public List<Map<String, Object>> getClipsCommentedByUser(Long userId) {
        return clipRepository.findClipsCommentedByUser(userId);
    }

    public List<Map<String, Object>> getClipsByUserId(Long uploaderId) {
        List<Map<String, Object>> clips = normalizeRows(clipRepository.findAllByUserId(uploaderId));
        for (Map<String, Object> clip : clips) {
            Long clipId = ((Number) clip.get("id")).longValue();
            clip.put("tags", clipRepository.getTagsForClip(clipId));
        }
        return clips;
    }

    public List<Map<String, Object>> getFavoritesByUserId(Long userId) {
        return normalizeRows(clipRepository.findFavoritesByUserId(userId));
    }

    public void addFavorite(Long userId, Long clipId) {
        clipRepository.addFavorite(userId, clipId);
    }

    public void removeFavorite(Long userId, Long clipId) {
        clipRepository.removeFavorite(userId, clipId);
    }

    public List<Map<String, Object>> getAllClips() {
        List<Map<String, Object>> clips = normalizeRows(clipRepository.findAllClips());
        for (Map<String, Object> clip : clips) {
            Long clipId = ((Number) clip.get("id")).longValue();
            clip.put("tags", clipRepository.getTagsForClip(clipId));
        }
        return clips;
    }

    public Map<String, Object> getClipById(Long id) {
        Map<String, Object> clip = normalizeRow(clipRepository.findClipDetailsById(id));
        if (clip != null) {
            clip.put("tags", clipRepository.getTagsForClip(id));
        }
        return clip;
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

    public List<Map<String, Object>> getDeletedClipsByUserId(Long uploaderId) {
        return normalizeRows(clipRepository.findAllDeletedByUserId(uploaderId));
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

    private Float toFloat(Double value, Double fallback) {
        return (value != null ? value : fallback).floatValue();
    }

    private List<Map<String, Object>> normalizeRows(List<Map<String, Object>> rows) {
        return rows.stream().map(this::normalizeRow).toList();
    }

    private Map<String, Object> normalizeRow(Map<String, Object> row) {
        if (row == null) {
            return null;
        }
        Map<String, Object> normalized = new HashMap<>();
        row.forEach((key, value) -> normalized.put(normalizeKey(key), value));
        return normalized;
    }

    private String normalizeKey(String key) {
        String compact = key.replace("_", "").toLowerCase();
        return switch (compact) {
            case "thumbnailurl" -> "thumbnailUrl";
            case "starttime" -> "startTime";
            case "endtime" -> "endTime";
            case "isdeleted" -> "isDeleted";
            case "datecreated" -> "dateCreated";
            case "moderationstatus" -> "moderationStatus";
            case "moderationscore" -> "moderationScore";
            case "moderationreason" -> "moderationReason";
            case "moderationcheckedat" -> "moderationCheckedAt";
            case "reviewedby" -> "reviewedBy";
            case "reviewedat" -> "reviewedAt";
            case "removedreason" -> "removedReason";
            case "removedat" -> "removedAt";
            case "visibilitystatus" -> "visibilityStatus";
            case "uploaderid" -> "uploaderId";
            default -> toCamelCase(key);
        };
    }

    private String toCamelCase(String key) {
        String lower = key.toLowerCase();
        StringBuilder result = new StringBuilder();
        boolean upperNext = false;
        for (char ch : lower.toCharArray()) {
            if (ch == '_') {
                upperNext = true;
            } else if (upperNext) {
                result.append(Character.toUpperCase(ch));
                upperNext = false;
            } else {
                result.append(ch);
            }
        }
        return result.toString();
    }
}
