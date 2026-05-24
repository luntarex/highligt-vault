package hvault.app.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;

import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import hvault.app.dto.ClipCreateRequest;
import hvault.app.dto.ClipResponse;
import hvault.app.dto.ClipUpdateRequest;
import hvault.app.entity.Clip;
import hvault.app.entity.ModerationAction;
import hvault.app.entity.Game;
import hvault.app.enums.ModerationActionType;
import hvault.app.enums.ModerationStatus;
import hvault.app.enums.ReportTargetType;
import hvault.app.enums.VisibilityStatus;
import hvault.app.repository.ClipRepository;
import hvault.app.repository.GameRepository;
import hvault.app.repository.ModerationActionRepository;
import hvault.app.repository.projection.ClipView;
import hvault.app.repository.projection.CommentedClipView;

@Service
public class ClipService {
    private final ClipRepository clipRepository;
    private final GameRepository gameRepository;
    private final PostService postService;
    private final ModerationActionRepository moderationActionRepository;

    public ClipService(
        ClipRepository clipRepository,
        GameRepository gameRepository,
        PostService postService,
        ModerationActionRepository moderationActionRepository
    ) {
        this.clipRepository = clipRepository;
        this.gameRepository = gameRepository;
        this.postService = postService;
        this.moderationActionRepository = moderationActionRepository;
    }

    public List<ClipResponse> getClipsCommentedByUser(Long userId) {
        return clipRepository.findClipsCommentedByUser(userId).stream()
            .map(this::toClipResponse)
            .toList();
    }

    public List<ClipResponse> getClipsByUserId(Long uploaderId) {
        return clipRepository.findActiveEntitiesByUploaderId(uploaderId).stream()
            .filter(this::isVisibleInLibrary)
            .map(this::toClipResponse)
            .toList();
    }

    public List<ClipResponse> getClipsByUserId(Long uploaderId, Long currentUserId, boolean admin) {
        boolean ownerOrAdmin = admin || uploaderId.equals(currentUserId);
        return clipRepository.findActiveEntitiesByUploaderId(uploaderId).stream()
            .filter(clip -> ownerOrAdmin ? isVisibleInLibrary(clip) : isPubliclyReadable(clip))
            .map(clip -> ownerOrAdmin ? toClipResponse(clip) : toPublicClipResponse(clip))
            .toList();
    }

    public List<ClipResponse> getFavoritesByUserId(Long userId) {
        return clipRepository.findFavoritesByUserId(userId).stream()
            .map(this::toPublicClipResponse)
            .toList();
    }

    public void addFavorite(Long userId, Long clipId) {
        clipRepository.addFavorite(userId, clipId);
    }

    public void removeFavorite(Long userId, Long clipId) {
        clipRepository.removeFavorite(userId, clipId);
    }

    public List<ClipResponse> getAllClips() {
        return clipRepository.findAllActiveEntities().stream()
            .map(this::toClipResponse)
            .toList();
    }

    public List<ClipResponse> getPublicClips() {
        return clipRepository.findAllActiveEntities().stream()
            .filter(this::isPubliclyReadable)
            .map(this::toPublicClipResponse)
            .toList();
    }

    public ClipResponse getClipById(Long id, Long currentUserId, boolean admin) {
        Clip clip = clipRepository.findById(id).orElse(null);
        if (clip == null) {
            return null;
        }
        if (admin || currentUserId.equals(clip.getUploaderId())) {
            return toClipResponse(clip);
        }
        return isPubliclyReadable(clip) ? toPublicClipResponse(clip) : null;
    }

    public Long createClip(ClipCreateRequest clipData, Long currentUserId) {
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
        clip.setUploaderId(currentUserId);
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
        return clipId;
    }

    public void updateClip(Long id, ClipUpdateRequest clipData, Long currentUserId, boolean admin) {
        requireClipOwnerOrAdmin(id, currentUserId, admin);
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

    public void deleteClip(Long id, Long currentUserId, boolean admin) {
        requireClipOwnerOrAdmin(id, currentUserId, admin);
        clipRepository.softDeleteClip(id);
    }

    public void hardDeleteClip(Long id, Long currentUserId, boolean admin) {
        requireClipOwnerOrAdmin(id, currentUserId, admin);
        if (!admin) {
            Clip clip = clipRepository.findById(id)
                .orElseThrow(() -> new NoSuchElementException("Clip not found."));
            if (isModerationRemoved(clip)) {
                throw new AccessDeniedException("This clip was removed by moderation and cannot be permanently deleted by the uploader.");
            }
        }
        clipRepository.hardDeleteClip(id);
    }

    public List<ClipResponse> getDeletedClipsByUserId(Long uploaderId) {
        return clipRepository.findDeletedEntitiesByUploaderId(uploaderId).stream()
            .map(this::toClipResponse)
            .toList();
    }

    public void recoverClip(Long id, Long currentUserId, boolean admin) {
        requireClipOwnerOrAdmin(id, currentUserId, admin);
        Clip clip = clipRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Clip not found."));
        if (isModerationRemoved(clip)) {
            throw new AccessDeniedException("This clip was removed by moderation and cannot be recovered from the user trash.");
        }
        if (!Boolean.TRUE.equals(clip.getIsDeleted())) {
            throw new IllegalArgumentException("Only user-deleted clips can be recovered from trash.");
        }
        clipRepository.recoverClip(id);
    }

    public void appealClip(Long id, String reason, Long currentUserId) {
        Clip clip = clipRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Clip not found."));
        if (!currentUserId.equals(clip.getUploaderId())) {
            throw new AccessDeniedException("You do not have permission to appeal this clip.");
        }
        if (clip.getModerationStatus() != ModerationStatus.REJECTED
            && clip.getVisibilityStatus() != VisibilityStatus.HIDDEN) {
            throw new IllegalArgumentException("Only rejected or hidden clips can be appealed.");
        }

        String appealReason = reason == null || reason.isBlank()
            ? "User appealed the moderation decision."
            : reason.trim();
        clipRepository.appealClip(id, appealReason);

        ModerationAction action = new ModerationAction();
        action.setModeratorId(currentUserId);
        action.setTargetType(ReportTargetType.CLIP);
        action.setTargetId(id);
        action.setAction(ModerationActionType.APPEAL);
        action.setReason(appealReason);
        action.setCreatedAt(LocalDateTime.now());
        moderationActionRepository.save(action);
    }

    public void ensureClipOwnerOrAdmin(Long id, Long currentUserId, boolean admin) {
        requireClipOwnerOrAdmin(id, currentUserId, admin);
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
        response.setIsDeleted(toBoolean(clip.getIsDeleted()));
        response.setDateCreated(clip.getDateCreated());
        response.setUploaderId(clip.getUploaderId());
        response.setTags(getTagsSafely(clip.getId()));
        response.setModerationStatus(parseEnum(ModerationStatus.class, clip.getModerationStatus()));
        response.setModerationScore(clip.getModerationScore());
        response.setModerationReason(clip.getModerationReason());
        response.setVisibilityStatus(parseEnum(VisibilityStatus.class, clip.getVisibilityStatus()));
        response.setRemovedReason(clip.getRemovedReason());
        return response;
    }

    private ClipResponse toPublicClipResponse(ClipView clip) {
        ClipResponse response = new ClipResponse();
        response.setId(clip.getId());
        response.setTitle(clip.getTitle());
        response.setUrl(clip.getUrl());
        response.setThumbnailUrl(clip.getThumbnailUrl());
        response.setDuration(clip.getDuration());
        response.setStartTime(clip.getStartTime());
        response.setEndTime(clip.getEndTime());
        response.setGame(clip.getGame());
        response.setDateCreated(clip.getDateCreated());
        response.setUploaderId(clip.getUploaderId());
        response.setTags(getTagsSafely(clip.getId()));
        return response;
    }

    private ClipResponse toClipResponse(Clip clip) {
        ClipResponse response = new ClipResponse();
        response.setId(clip.getId());
        response.setTitle(clip.getTitle());
        response.setUrl(clip.getVideoUrl());
        response.setThumbnailUrl(clip.getThumbnailUrl());
        response.setDuration(toDouble(clip.getDuration()));
        response.setStartTime(toDouble(clip.getStartTime()));
        response.setEndTime(toDouble(clip.getEndTime()));
        response.setNotes(clip.getNotes());
        response.setGame(clip.getGame() != null ? clip.getGame().getName() : null);
        response.setIsDeleted(Boolean.TRUE.equals(clip.getIsDeleted()));
        response.setDateCreated(clip.getCreatedAt());
        response.setUploaderId(clip.getUploaderId());
        response.setTags(getTagsSafely(clip.getId()));
        response.setModerationStatus(clip.getModerationStatus());
        response.setModerationScore(clip.getModerationScore());
        response.setModerationReason(clip.getModerationReason());
        response.setVisibilityStatus(clip.getVisibilityStatus());
        response.setRemovedReason(clip.getRemovedReason());
        return response;
    }

    private ClipResponse toPublicClipResponse(Clip clip) {
        ClipResponse response = new ClipResponse();
        response.setId(clip.getId());
        response.setTitle(clip.getTitle());
        response.setUrl(clip.getVideoUrl());
        response.setThumbnailUrl(clip.getThumbnailUrl());
        response.setDuration(toDouble(clip.getDuration()));
        response.setStartTime(toDouble(clip.getStartTime()));
        response.setEndTime(toDouble(clip.getEndTime()));
        response.setGame(clip.getGame() != null ? clip.getGame().getName() : null);
        response.setDateCreated(clip.getCreatedAt());
        response.setUploaderId(clip.getUploaderId());
        response.setTags(getTagsSafely(clip.getId()));
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
        response.setTags(getTagsSafely(clip.getId()));
        return response;
    }

    private <T extends Enum<T>> T parseEnum(Class<T> enumType, String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        try {
            return Enum.valueOf(enumType, value.trim().toUpperCase(Locale.ROOT));
        } catch (IllegalArgumentException ex) {
            return null;
        }
    }

    private Float toFloat(Double value, Double fallback) {
        return (value != null ? value : fallback).floatValue();
    }

    private Double toDouble(Float value) {
        return value == null ? null : value.doubleValue();
    }

    private boolean toBoolean(Number value) {
        return value != null && value.intValue() != 0;
    }

    private List<String> getTagsSafely(Long clipId) {
        return clipId == null ? List.of() : clipRepository.getTagsForClip(clipId);
    }

    private void requireClipOwnerOrAdmin(Long clipId, Long currentUserId, boolean admin) {
        if (admin) {
            return;
        }
        Clip clip = clipRepository.findById(clipId)
            .orElseThrow(() -> new NoSuchElementException("Clip not found."));
        if (currentUserId == null || !currentUserId.equals(clip.getUploaderId())) {
            throw new AccessDeniedException("You do not have permission to modify this clip.");
        }
    }

    private boolean isVisibleInLibrary(Clip clip) {
        return clip.getVisibilityStatus() != VisibilityStatus.HIDDEN
            && clip.getVisibilityStatus() != VisibilityStatus.REMOVED;
    }

    private boolean isPubliclyReadable(Clip clip) {
        return !Boolean.TRUE.equals(clip.getIsDeleted())
            && clip.getVisibilityStatus() == VisibilityStatus.PUBLIC
            && (clip.getModerationStatus() == ModerationStatus.APPROVED
                || clip.getModerationStatus() == ModerationStatus.AUTO_APPROVED);
    }

    private boolean isModerationRemoved(Clip clip) {
        return clip.getModerationStatus() == ModerationStatus.REMOVED
            || clip.getRemovedAt() != null;
    }
}
