package hvault.app.service;

import hvault.app.dto.ClipGroupDetailResponse;
import hvault.app.dto.ClipGroupResponse;
import hvault.app.dto.ClipResponse;
import hvault.app.entity.ClipGroup;
import hvault.app.enums.ModerationStatus;
import hvault.app.enums.VisibilityStatus;
import hvault.app.repository.ClipGroupRepository;
import hvault.app.repository.projection.ClipView;
import hvault.app.repository.projection.ClipGroupView;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;

@Service
public class ClipGroupService {

    private final ClipGroupRepository clipGroupRepository;

    public ClipGroupService(ClipGroupRepository clipGroupRepository) {
        this.clipGroupRepository = clipGroupRepository;
    }

    public List<ClipGroupResponse> getGroupsByUserId(Long userId, String type) {
        return clipGroupRepository.findGroupsByUserId(userId, normalizeType(type)).stream()
            .map(this::toResponse)
            .toList();
    }

    public ClipGroupDetailResponse getGroupById(Long id, Long currentUserId, boolean admin) {
        ClipGroupView group = clipGroupRepository.findGroupById(id);
        if (group == null) {
            throw new NoSuchElementException("Group not found");
        }
        requireGroupOwnerOrAdmin(group, currentUserId, admin);

        ClipGroupDetailResponse response = new ClipGroupDetailResponse();
        fillGroupResponse(response, group);
        response.setClips(clipGroupRepository.findClipsByGroupId(id).stream()
            .map(this::toClipResponse)
            .toList());
        return response;
    }

    public Long createGroup(Long userId, String name, String description, String type, List<Long> clipIds) {
        if (name == null || name.trim().isEmpty()) {
            throw new IllegalArgumentException("Group name cannot be empty");
        }

        ClipGroup group = new ClipGroup();
        group.setUserId(userId);
        group.setName(name.trim());
        group.setDescription(description == null ? "" : description.trim());
        group.setCreatedAt(LocalDateTime.now());
        group.setType(normalizeType(type));

        Long groupId = clipGroupRepository.save(group).getId();
        addClipsToGroup(groupId, clipIds, userId, false);
        return groupId;
    }

    public void addClipsToGroup(Long groupId, List<Long> clipIds, Long currentUserId, boolean admin) {
        ClipGroupView group = clipGroupRepository.findGroupById(groupId);
        if (group == null) {
            throw new NoSuchElementException("Group not found");
        }
        requireGroupOwnerOrAdmin(group, currentUserId, admin);

        if (clipIds == null || clipIds.isEmpty()) {
            return;
        }

        for (Long clipId : clipIds.stream().distinct().toList()) {
            if (clipId != null && (admin || clipGroupRepository.countAccessibleClip(clipId, currentUserId) > 0)) {
                clipGroupRepository.addClipToGroup(groupId, clipId);
            }
        }
    }

    public void removeClipFromGroup(Long groupId, Long clipId, Long currentUserId, boolean admin) {
        ClipGroupView group = clipGroupRepository.findGroupById(groupId);
        if (group == null) {
            throw new NoSuchElementException("Group not found");
        }
        requireGroupOwnerOrAdmin(group, currentUserId, admin);
        clipGroupRepository.removeClipFromGroup(groupId, clipId);
    }

    public void deleteGroup(Long groupId, Long currentUserId, boolean admin) {
        ClipGroupView group = clipGroupRepository.findGroupById(groupId);
        if (group == null) {
            throw new NoSuchElementException("Group not found");
        }
        requireGroupOwnerOrAdmin(group, currentUserId, admin);
        clipGroupRepository.deleteGroup(groupId);
    }

    private ClipGroupResponse toResponse(ClipGroupView group) {
        ClipGroupResponse response = new ClipGroupResponse();
        fillGroupResponse(response, group);
        return response;
    }

    private void fillGroupResponse(ClipGroupResponse response, ClipGroupView group) {
        response.setId(group.getId());
        response.setUserId(group.getUserId());
        response.setName(group.getName());
        response.setDescription(group.getDescription());
        response.setCreatedAt(group.getCreatedAt());
        response.setClipCount(group.getClipCount());
        response.setType(group.getType());
        response.setThumbnailUrl(group.getThumbnailUrl());
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
        response.setIsDeleted(clip.getIsDeleted() != null && clip.getIsDeleted().intValue() != 0);
        response.setDateCreated(clip.getDateCreated());
        response.setUploaderId(clip.getUploaderId());
        response.setTags(clipGroupRepository.getTagsForClip(clip.getId()));
        response.setModerationStatus(parseEnum(ModerationStatus.class, clip.getModerationStatus()));
        response.setModerationScore(clip.getModerationScore());
        response.setModerationReason(clip.getModerationReason());
        response.setVisibilityStatus(parseEnum(VisibilityStatus.class, clip.getVisibilityStatus()));
        response.setRemovedReason(clip.getRemovedReason());
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

    private String normalizeType(String type) {
        if (type == null || type.trim().isEmpty()) {
            return "LIBRARY";
        }
        return type.trim().toUpperCase();
    }

    private void requireGroupOwnerOrAdmin(ClipGroupView group, Long currentUserId, boolean admin) {
        if (admin) {
            return;
        }
        if (currentUserId == null || !currentUserId.equals(group.getUserId())) {
            throw new AccessDeniedException("You do not have permission to modify this group.");
        }
    }
}
