package hvault.app.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

import org.springframework.stereotype.Service;

import hvault.app.dto.CreateReportRequest;
import hvault.app.dto.ModerationQueueItemResponse;
import hvault.app.dto.ReportResponse;
import hvault.app.entity.ContentReport;
import hvault.app.entity.Comment;
import hvault.app.enums.ReportReason;
import hvault.app.enums.ReportStatus;
import hvault.app.enums.ReportTargetType;
import hvault.app.enums.ModerationStatus;
import hvault.app.enums.VisibilityStatus;
import hvault.app.repository.ClipRepository;
import hvault.app.repository.CommentRepository;
import hvault.app.repository.PostRepository;
import hvault.app.repository.ReportRepository;
import hvault.app.repository.UserRepository;
import hvault.app.repository.projection.ModerationQueueItemView;
import hvault.app.repository.projection.ReportView;

@Service
public class ReportService {
    private final ReportRepository reportRepository;
    private final ClipRepository clipRepository;
    private final PostRepository postRepository;
    private final CommentRepository commentRepository;
    private final UserRepository userRepository;

    public ReportService(
        ReportRepository reportRepository,
        ClipRepository clipRepository,
        PostRepository postRepository,
        CommentRepository commentRepository,
        UserRepository userRepository
    ) {
        this.reportRepository = reportRepository;
        this.clipRepository = clipRepository;
        this.postRepository = postRepository;
        this.commentRepository = commentRepository;
        this.userRepository = userRepository;
    }

    public Long createReport(CreateReportRequest request, Long reporterId) {
        validateTarget(request.getTargetType(), request.getTargetId(), reporterId);
        if (reportRepository.hasOpenReport(reporterId, request.getTargetType().name(), request.getTargetId())) {
            throw new IllegalArgumentException("You already have an open report for this content.");
        }

        ContentReport report = new ContentReport();
        report.setReporterId(reporterId);
        report.setTargetType(request.getTargetType());
        report.setTargetId(request.getTargetId());
        report.setReason(request.getReason());
        report.setDetails(cleanDetails(request.getDetails()));
        report.setStatus(ReportStatus.OPEN);
        report.setCreatedAt(LocalDateTime.now());
        return reportRepository.save(report).getId();
    }

    public List<ReportResponse> getReportsByUser(Long reporterId) {
        return reportRepository.findByReporterId(reporterId).stream()
            .map(report -> toReportResponse(report, false))
            .toList();
    }

    public List<ReportResponse> getOpenReports() {
        return reportRepository.findOpenReports().stream()
            .map(report -> toReportResponse(report, true))
            .toList();
    }

    public void resolveReport(Long reportId, Long reviewerId, String resolution, boolean dismissed) {
        int updatedRows = reportRepository.resolveReport(reportId, reviewerId, cleanDetails(resolution), dismissed);
        if (updatedRows == 0) {
            throw new NoSuchElementException("Report not found.");
        }
    }

    private void validateTarget(ReportTargetType targetType, Long targetId, Long reporterId) {
        if (targetType == null || targetId == null || targetId <= 0) {
            throw new IllegalArgumentException("Please choose valid content to report.");
        }

        boolean exists = switch (targetType) {
            case CLIP -> postRepository.findByClipIdWithDetails(targetId) != null;
            case POST -> postRepository.findByPostIdWithDetails(targetId) != null;
            case COMMENT -> commentRepository.isPubliclyVisibleComment(targetId);
            case USER -> {
                if (targetId.equals(reporterId)) {
                    throw new IllegalArgumentException("You cannot report your own account.");
                }
                yield userRepository.existsById(targetId);
            }
        };

        if (!exists) {
            throw new NoSuchElementException("Reported content not found.");
        }
    }

    private String cleanDetails(String details) {
        if (details == null || details.isBlank()) {
            return null;
        }
        String trimmed = details.trim();
        return trimmed.length() <= 1000 ? trimmed : trimmed.substring(0, 1000);
    }

    private ReportResponse toReportResponse(ReportView report, boolean includeTargetDetails) {
        ReportResponse response = new ReportResponse();
        response.setId(report.getId());
        response.setReporterId(report.getReporterId());
        response.setTargetType(parseEnum(ReportTargetType.class, report.getTargetType()));
        response.setTargetId(report.getTargetId());
        response.setReason(parseEnum(ReportReason.class, report.getReason()));
        response.setDetails(report.getDetails());
        response.setStatus(parseEnum(ReportStatus.class, report.getStatus()));
        response.setCreatedAt(report.getCreatedAt());
        response.setReviewedBy(report.getReviewedBy());
        response.setReviewedAt(report.getReviewedAt());
        response.setResolution(report.getResolution());
        response.setReporterUsername(report.getReporterUsername());
        if (includeTargetDetails) {
            Long targetPostId = resolveTargetPostId(response.getTargetType(), response.getTargetId());
            response.setTargetPostId(targetPostId);
            response.setTargetClip(resolveTargetClip(response.getTargetType(), response.getTargetId(), targetPostId));
        }
        return response;
    }

    private Long resolveTargetPostId(ReportTargetType targetType, Long targetId) {
        if (targetType == null || targetId == null) {
            return null;
        }

        return switch (targetType) {
            case CLIP -> postRepository.getPostIdByClipId(targetId);
            case POST -> targetId;
            case COMMENT -> commentRepository.findById(targetId)
                .map(Comment::getPostId)
                .orElse(null);
            case USER -> null;
        };
    }

    private ModerationQueueItemResponse resolveTargetClip(ReportTargetType targetType, Long targetId, Long targetPostId) {
        if (targetType == null || targetId == null) {
            return null;
        }
        if (targetType == ReportTargetType.USER) {
            return null;
        }
        if (targetType != ReportTargetType.CLIP && targetPostId == null) {
            return null;
        }

        Long clipId = targetType == ReportTargetType.CLIP
            ? targetId
            : postRepository.getClipIdByPostId(targetPostId);

        if (clipId == null) {
            return null;
        }

        ModerationQueueItemView clip = clipRepository.findReportClipById(clipId);
        return clip == null ? null : toModerationQueueItemResponse(clip);
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
        response.setModerationCategory(item.getModerationCategory());
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
