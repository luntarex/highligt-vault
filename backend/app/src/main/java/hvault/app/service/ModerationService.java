package hvault.app.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import hvault.app.dto.ModerationDecisionRequest;
import hvault.app.entity.ModerationAction;
import hvault.app.enums.ModerationActionType;
import hvault.app.enums.ReportTargetType;
import hvault.app.repository.ClipRepository;
import hvault.app.repository.ModerationActionRepository;

@Service
public class ModerationService {
    private final ClipRepository clipRepository;
    private final ModerationActionRepository moderationActionRepository;

    public ModerationService(ClipRepository clipRepository, ModerationActionRepository moderationActionRepository) {
        this.clipRepository = clipRepository;
        this.moderationActionRepository = moderationActionRepository;
    }

    public List<Map<String, Object>> getClipQueue() {
        return clipRepository.findModerationQueue();
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
}
