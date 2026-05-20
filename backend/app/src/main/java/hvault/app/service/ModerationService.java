package hvault.app.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hvault.app.dto.ModerationDecisionRequest;
import hvault.app.dto.ModerationQueueItemResponse;
import hvault.app.entity.ModerationAction;
import hvault.app.enums.ModerationActionType;
import hvault.app.enums.ModerationStatus;
import hvault.app.enums.ReportTargetType;
import hvault.app.enums.VisibilityStatus;
import hvault.app.repository.ClipRepository;
import hvault.app.repository.ModerationActionRepository;
import hvault.app.repository.projection.ModerationQueueItemView;

@Service
public class ModerationService {
    private final ClipRepository clipRepository;
    private final ModerationActionRepository moderationActionRepository;

    public ModerationService(ClipRepository clipRepository, ModerationActionRepository moderationActionRepository) {
        this.clipRepository = clipRepository;
        this.moderationActionRepository = moderationActionRepository;
    }

    public List<ModerationQueueItemResponse> getClipQueue() {
        return clipRepository.findModerationQueue().stream()
            .map(this::toModerationQueueItemResponse)
            .toList();
    }

    @Transactional
    public void decideClip(Long clipId, ModerationDecisionRequest request) {
        ModerationActionType actionType = request.getAction();
        Long moderatorId = request.getModeratorId();
        String reason = request.getReason();

        switch (actionType) {
            case APPROVE -> clipRepository.approveClip(clipId, moderatorId, reason);
            case REJECT -> clipRepository.rejectClip(clipId, moderatorId, reason);
            case REMOVE -> clipRepository.removeClipByModeration(clipId, moderatorId, reason);
            case RESTORE -> clipRepository.restoreClip(clipId, moderatorId, reason);
            default -> throw new IllegalArgumentException("Unsupported clip moderation action: " + actionType);
        }

        ModerationAction action = new ModerationAction();
        action.setModeratorId(moderatorId);
        action.setTargetType(ReportTargetType.CLIP);
        action.setTargetId(clipId);
        action.setAction(actionType);
        action.setReason(reason);
        action.setCreatedAt(LocalDateTime.now());
        moderationActionRepository.save(action);
    }

    private ModerationQueueItemResponse toModerationQueueItemResponse(ModerationQueueItemView item) {
        ModerationQueueItemResponse response = new ModerationQueueItemResponse();
        response.setClipId(item.getClipId());
        response.setTitle(item.getTitle());
        response.setVideoUrl(item.getVideoUrl());
        response.setThumbnailUrl(item.getThumbnailUrl());
        response.setUploaderId(item.getUploaderId());
        response.setUploaderUsername(item.getUploaderUsername());
        response.setModerationStatus(parseEnum(ModerationStatus.class, item.getModerationStatus()));
        response.setModerationScore(item.getModerationScore());
        response.setModerationReason(item.getModerationReason());
        response.setVisibilityStatus(parseEnum(VisibilityStatus.class, item.getVisibilityStatus()));
        response.setCreatedAt(item.getCreatedAt());
        return response;
    }

    private <T extends Enum<T>> T parseEnum(Class<T> enumType, String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return Enum.valueOf(enumType, value);
    }
}
