package hvault.app.service;

import hvault.app.dto.ClipGroupClipResponse;
import hvault.app.dto.ClipGroupResponse;
import hvault.app.entity.ClipGroup;
import hvault.app.repository.ClipGroupRepository;
import hvault.app.repository.projection.ClipGroupClipView;
import hvault.app.repository.projection.ClipGroupView;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class ClipGroupService {

    private final ClipGroupRepository clipGroupRepository;

    public ClipGroupService(ClipGroupRepository clipGroupRepository) {
        this.clipGroupRepository = clipGroupRepository;
    }

    public List<ClipGroupResponse> getClipGroupsByUserId(Long userId, String type) {
        return clipGroupRepository.findClipGroupsByUserId(userId).stream()
            .filter(clipGroup -> type == null || type.equals(clipGroup.getType()))
            .map(clipGroup -> toClipGroupResponse(clipGroup, null))
            .toList();
    }

    public ClipGroupResponse getClipGroupById(Long id, Long currentUserId, boolean admin) {
        ClipGroupView clipGroup = clipGroupRepository.findClipGroupById(id);
        if (clipGroup == null) {
            throw new NoSuchElementException("ClipGroup not found");
        }
        requireClipGroupOwnerOrAdmin(clipGroup, currentUserId, admin);

        List<ClipGroupClipResponse> clips = clipGroupRepository.findClipsByClipGroupId(id).stream()
            .map(this::toClipGroupClipResponse)
            .toList();

        return toClipGroupResponse(clipGroup, clips);
    }

    public Long createClipGroup(Long userId, String name, String description, String type) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("ClipGroup name cannot be empty");
        }
        ClipGroup clipGroup = new ClipGroup();
        clipGroup.setUserId(userId);
        clipGroup.setName(name);
        clipGroup.setDescription(description);
        clipGroup.setType(type != null ? type : "LIBRARY");
        clipGroup.setCreatedAt(LocalDateTime.now());
        return clipGroupRepository.save(clipGroup).getId();
    }

    public void updateClipGroup(Long id, String name, String description, Long currentUserId, boolean admin) {
        ClipGroupView clipGroup = clipGroupRepository.findClipGroupById(id);
        if (clipGroup == null) {
            throw new NoSuchElementException("ClipGroup not found");
        }
        requireClipGroupOwnerOrAdmin(clipGroup, currentUserId, admin);
        clipGroupRepository.updateClipGroup(id, name, description);
    }

    public void deleteClipGroup(Long id, Long currentUserId, boolean admin) {
        ClipGroupView clipGroup = clipGroupRepository.findClipGroupById(id);
        if (clipGroup == null) {
            throw new NoSuchElementException("ClipGroup not found");
        }
        requireClipGroupOwnerOrAdmin(clipGroup, currentUserId, admin);
        clipGroupRepository.deleteClipGroup(id);
    }

    public void addClipToClipGroup(Long clipGroupId, Long clipId, Long currentUserId, boolean admin) {
        ClipGroupView clipGroup = clipGroupRepository.findClipGroupById(clipGroupId);
        if (clipGroup == null) {
            throw new NoSuchElementException("ClipGroup not found");
        }
        requireClipGroupOwnerOrAdmin(clipGroup, currentUserId, admin);
        clipGroupRepository.addClipToClipGroup(clipGroupId, clipId);
    }

    public void removeClipFromClipGroup(Long clipGroupId, Long clipId, Long currentUserId, boolean admin) {
        ClipGroupView clipGroup = clipGroupRepository.findClipGroupById(clipGroupId);
        if (clipGroup == null) {
            throw new NoSuchElementException("ClipGroup not found");
        }
        requireClipGroupOwnerOrAdmin(clipGroup, currentUserId, admin);
        clipGroupRepository.removeClipFromClipGroup(clipGroupId, clipId);
    }

    private ClipGroupResponse toClipGroupResponse(ClipGroupView clipGroup, List<ClipGroupClipResponse> clips) {
        ClipGroupResponse response = new ClipGroupResponse();
        response.setId(clipGroup.getId());
        response.setName(clipGroup.getName());
        response.setDescription(clipGroup.getDescription());
        response.setUserId(clipGroup.getUserId());
        response.setCreatedAt(clipGroup.getCreatedAt());
        response.setType(clipGroup.getType());
        response.setThumbnailUrl(clipGroup.getThumbnailUrl());
        response.setClips(clips);
        return response;
    }

    private ClipGroupClipResponse toClipGroupClipResponse(ClipGroupClipView clip) {
        ClipGroupClipResponse response = new ClipGroupClipResponse();
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

    private void requireClipGroupOwnerOrAdmin(ClipGroupView clipGroup, Long currentUserId, boolean admin) {
        if (admin) {
            return;
        }
        if (currentUserId == null || !currentUserId.equals(clipGroup.getUserId())) {
            throw new AccessDeniedException("You do not have permission to modify this clipGroup.");
        }
    }
}
