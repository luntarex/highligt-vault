package hvault.app.service;

import hvault.app.entity.Clip;
import hvault.app.entity.ModerationResult;
import hvault.app.enums.ModerationStatus;
import hvault.app.enums.ReportTargetType;
import hvault.app.enums.VisibilityStatus;
import hvault.app.repository.ClipRepository;
import hvault.app.repository.ModerationResultRepository;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;

@Service
public class ModerationScannerService {
    private static final Logger logger = LoggerFactory.getLogger(ModerationScannerService.class);

    private final ClipRepository clipRepository;
    private final ModerationResultRepository moderationResultRepository;
    private final OpenAiVisualModerationService openAiVisualModerationService;
    private final FfmpegFrameExtractionService ffmpegFrameExtractionService;
    private final FfmpegAudioExtractionService ffmpegAudioExtractionService;
    private final OpenAiAudioTranscriptionService openAiAudioTranscriptionService;
    private final ModerationFeedbackService moderationFeedbackService;

    public ModerationScannerService(
        ClipRepository clipRepository,
        ModerationResultRepository moderationResultRepository,
        OpenAiVisualModerationService openAiVisualModerationService,
        FfmpegFrameExtractionService ffmpegFrameExtractionService,
        FfmpegAudioExtractionService ffmpegAudioExtractionService,
        OpenAiAudioTranscriptionService openAiAudioTranscriptionService,
        ModerationFeedbackService moderationFeedbackService
    ) {
        this.clipRepository = clipRepository;
        this.moderationResultRepository = moderationResultRepository;
        this.openAiVisualModerationService = openAiVisualModerationService;
        this.ffmpegFrameExtractionService = ffmpegFrameExtractionService;
        this.ffmpegAudioExtractionService = ffmpegAudioExtractionService;
        this.openAiAudioTranscriptionService = openAiAudioTranscriptionService;
        this.moderationFeedbackService = moderationFeedbackService;
    }

    public ModerationScanResult scanClipForPublishing(Long clipId, String caption) {
        return scanClip(clipId, caption, VisibilityStatus.PUBLIC);
    }

    public ModerationScanResult scanClipForUpload(Long clipId) {
        return scanClip(clipId, "", VisibilityStatus.PRIVATE);
    }

    private ModerationScanResult scanClip(Long clipId, String caption, VisibilityStatus cleanVisibilityStatus) {
        Clip clip = clipRepository.findById(clipId)
            .orElseThrow(() -> new IllegalArgumentException("Clip not found."));

        ModerationScanResult metadataResult = runMetadataPrecheck(clip, caption);
        saveResult(clipId, "METADATA_PRECHECK", metadataResult.category(), metadataResult.score(), metadataResult.flagged(), metadataResult.reason());

        ModerationScanResult finalResult = metadataResult;
        String audioTranscript = extractAudioTranscript(clip);
        String moderatorFeedback = moderationFeedbackService.buildFeedbackContext();
        String aiContext = buildAiContext(clip, caption, audioTranscript, moderatorFeedback);
        List<String> frameDataUrls = ffmpegFrameExtractionService.extractFrameDataUrls(clip.getVideoUrl());
        if (!frameDataUrls.isEmpty()) {
            Optional<VisualModerationSignal> clipSignal = openAiVisualModerationService.scanClip(frameDataUrls, aiContext);
            if (clipSignal.isPresent()) {
                VisualModerationSignal signal = clipSignal.get();
                saveResult(clipId, "OPENAI_CLIP", signal.category(), signal.score(), signal.flagged(), signal.rawResult());
                finalResult = combine(finalResult, signal);
            } else {
                finalResult = requireManualReview(finalResult, "AI_NO_RESULT", "AI moderation returned no decision for extracted frames.");
                saveResult(clipId, "OPENAI_CLIP", finalResult.category(), finalResult.score(), finalResult.flagged(), finalResult.reason());
            }
        } else {
            saveResult(clipId, "FFMPEG", "FRAME_EXTRACTION_SKIPPED", 0, false, "FFmpeg frames were unavailable; thumbnail scan fallback will be used if configured.");
            Optional<VisualModerationSignal> visualSignal = openAiVisualModerationService.scanImageUrl(clip.getThumbnailUrl(), aiContext);
            if (visualSignal.isPresent()) {
                VisualModerationSignal signal = visualSignal.get();
                saveResult(clipId, "OPENAI_THUMBNAIL", signal.category(), signal.score(), signal.flagged(), signal.rawResult());
                finalResult = combine(metadataResult, signal);
            } else {
                finalResult = requireManualReview(finalResult, "AI_FRAME_AND_THUMBNAIL_UNAVAILABLE", "Neither FFmpeg frames nor AI thumbnail moderation produced a decision.");
                saveResult(clipId, "OPENAI_THUMBNAIL", finalResult.category(), finalResult.score(), finalResult.flagged(), finalResult.reason());
            }
        }

        finalResult = adjustCleanVisibility(finalResult, cleanVisibilityStatus);
        applyResult(clip, finalResult);
        logger.info(
            "Moderation finished for clip {}: status={}, visibility={}, category={}, score={}",
            clipId,
            finalResult.moderationStatus(),
            finalResult.visibilityStatus(),
            finalResult.category(),
            finalResult.score()
        );
        return finalResult;
    }

    private ModerationScanResult runMetadataPrecheck(Clip clip, String caption) {
        return new ModerationScanResult(
            ModerationStatus.AUTO_APPROVED,
            VisibilityStatus.PUBLIC,
            1,
            false,
            "METADATA_READY",
            "Metadata was prepared for AI policy review."
        );
    }

    private ModerationScanResult combine(ModerationScanResult ruleResult, VisualModerationSignal visualSignal) {
        if (visualSignal.category() != null && visualSignal.category().startsWith("AI_")) {
            return requireManualReview(ruleResult, visualSignal.category(), visualSignal.reason(), VisibilityStatus.PRIVATE);
        }
        if (visualSignal.flagged()) {
            return requireManualReview(
                ruleResult,
                visualSignal.category(),
                visualSignal.reason(),
                VisibilityStatus.HIDDEN,
                visualSignal.score()
            );
        }
        if (ruleResult.flagged()) {
            return ruleResult;
        }
        return new ModerationScanResult(
            ModerationStatus.AUTO_APPROVED,
            VisibilityStatus.PUBLIC,
            Math.max(ruleResult.score(), visualSignal.score()),
            false,
            "CLEAN",
            "Rule-based and AI visual moderation found no policy indicators."
        );
    }

    private ModerationScanResult requireManualReview(ModerationScanResult baseResult, String category, String reason) {
        return requireManualReview(baseResult, category, reason, VisibilityStatus.PRIVATE);
    }

    private ModerationScanResult requireManualReview(
        ModerationScanResult baseResult,
        String category,
        String reason,
        VisibilityStatus visibilityStatus
    ) {
        return requireManualReview(baseResult, category, reason, visibilityStatus, 0);
    }

    private ModerationScanResult requireManualReview(
        ModerationScanResult baseResult,
        String category,
        String reason,
        VisibilityStatus visibilityStatus,
        int providerScore
    ) {
        return new ModerationScanResult(
            ModerationStatus.NEEDS_MANUAL_REVIEW,
            visibilityStatus,
            Math.max(Math.max(baseResult.score(), providerScore), 40),
            true,
            category,
            reason
        );
    }

    private ModerationScanResult adjustCleanVisibility(ModerationScanResult result, VisibilityStatus cleanVisibilityStatus) {
        if (result.flagged() || cleanVisibilityStatus == VisibilityStatus.PUBLIC) {
            return result;
        }
        return new ModerationScanResult(
            result.moderationStatus(),
            cleanVisibilityStatus,
            result.score(),
            false,
            result.category(),
            "AI moderation passed; clip remains private until the user publishes it."
        );
    }

    private void applyResult(Clip clip, ModerationScanResult result) {
        clip.setModerationStatus(result.moderationStatus());
        clip.setVisibilityStatus(result.visibilityStatus());
        clip.setModerationScore(result.score());
        clip.setModerationReason(result.reason());
        clip.setModerationCheckedAt(LocalDateTime.now());
        if (result.visibilityStatus() == VisibilityStatus.PUBLIC) {
            clip.setRemovedReason(null);
            clip.setRemovedAt(null);
        }
        clipRepository.save(clip);
    }

    private void saveResult(Long clipId, String provider, String category, int score, boolean flagged, String rawResult) {
        try {
            ModerationResult result = new ModerationResult();
            result.setTargetType(ReportTargetType.CLIP);
            result.setTargetId(clipId);
            result.setProvider(limit(provider, 50));
            result.setCategory(limit(category, 50));
            result.setScore((float) score);
            result.setFlagged(flagged);
            result.setRawResult(toJson(rawResult));
            result.setCreatedAt(LocalDateTime.now());
            moderationResultRepository.saveAndFlush(result);
        } catch (Exception e) {
            logger.warn("Could not persist moderation audit result for clip {}: {}", clipId, e.getMessage());
        }
    }

    private String extractAudioTranscript(Clip clip) {
        List<AudioModerationSample> audioSamples = ffmpegAudioExtractionService.extractAudioSamples(clip.getVideoUrl());
        if (audioSamples.isEmpty()) {
            saveResult(clip.getId(), "FFMPEG_AUDIO", "AUDIO_EXTRACTION_SKIPPED", 0, false, "No audio samples were available for transcription.");
            return "";
        }

        Optional<String> transcript = openAiAudioTranscriptionService.transcribeSamples(audioSamples);
        if (transcript.isEmpty()) {
            saveResult(clip.getId(), "OPENAI_AUDIO", "AUDIO_TRANSCRIPTION_SKIPPED", 0, false, "Audio samples were available, but no transcript could be produced.");
            return "";
        }

        String safeTranscript = limit(transcript.get(), 2000);
        saveResult(
            clip.getId(),
            "OPENAI_AUDIO",
            "AUDIO_TRANSCRIBED",
            0,
            false,
            "{\"transcript\":\"" + escapeForJson(safeTranscript) + "\"}"
        );
        return safeTranscript;
    }

    private String buildAiContext(Clip clip, String caption, String audioTranscript, String moderatorFeedback) {
        return String.join(" | ", nonNullValues(
            "title=" + safeValue(clip.getTitle()),
            "notes=" + safeValue(clip.getNotes()),
            "caption=" + safeValue(caption),
            "audioTranscript=" + safeValue(audioTranscript),
            "moderatorFeedback=" + safeValue(moderatorFeedback),
            "tags=" + String.join(",", clipRepository.getTagsForClip(clip.getId())),
            "videoUrl=" + safeValue(clip.getVideoUrl())
        ));
    }

    private String toJson(String value) {
        String originalValue = value == null ? "" : value.trim();
        if (originalValue.length() <= 4000 && originalValue.startsWith("{") && originalValue.endsWith("}")) {
            return originalValue;
        }

        String safeValue = limit(value == null ? "" : value, 4000);
        String escaped = safeValue
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
        return "{\"message\":\"" + escaped + "\"}";
    }

    private String escapeForJson(String value) {
        return safeValue(value)
            .replace("\\", "\\\\")
            .replace("\"", "\\\"")
            .replace("\n", "\\n")
            .replace("\r", "\\r")
            .replace("\t", "\\t");
    }

    private String limit(String value, int maxLength) {
        if (value == null || value.length() <= maxLength) {
            return value;
        }
        return value.substring(0, maxLength);
    }

    private List<String> nonNullValues(String... values) {
        List<String> result = new ArrayList<>();
        for (String value : values) {
            if (value != null && !value.isBlank()) {
                result.add(value);
            }
        }
        return result;
    }

    private String safeValue(String value) {
        return value == null ? "" : value;
    }
}
