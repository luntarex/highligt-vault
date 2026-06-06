package hvault.app.service;

import static hvault.app.service.FfmpegSamplingUtils.calculateStartSeconds;
import static hvault.app.service.FfmpegSamplingUtils.cleanup;
import static hvault.app.service.FfmpegSamplingUtils.cloudinarySourceUrl;

import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FfmpegAudioExtractionService {
    @Value("${app.moderation.ai.audio-scan.enabled:true}")
    private boolean enabled;

    @Value("${app.moderation.ffmpeg.path:ffmpeg}")
    private String ffmpegPath;

    @Value("${app.moderation.ffmpeg.audio-segment-count:5}")
    private int segmentCount;

    @Value("${app.moderation.ffmpeg.audio-segment-seconds:4}")
    private int segmentSeconds;

    @Value("${app.moderation.ffmpeg.timeout-seconds:20}")
    private long timeoutSeconds;

    @Value("${app.moderation.ffmpeg.audio-segment-timeout-seconds:10}")
    private long audioSegmentTimeoutSeconds;

    public List<AudioModerationSample> extractAudioSamples(String videoUrl) {
        return extractAudioSamples(videoUrl, null);
    }

    public List<AudioModerationSample> extractAudioSamples(String videoUrl, Float videoDurationSeconds) {
        return extractAudioSamples(videoUrl, videoDurationSeconds, segmentCount, segmentSeconds);
    }

    public List<AudioModerationSample> extractAudioSamples(
        String videoUrl,
        Float videoDurationSeconds,
        int requestedSegmentCount,
        int requestedSegmentSeconds
    ) {
        if (!enabled || videoUrl == null || videoUrl.isBlank()) {
            return List.of();
        }

        String sourceUrl = cloudinarySourceUrl(videoUrl);
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("hvault-moderation-audio-");
            List<AudioModerationSample> samples = new ArrayList<>();
            int safeSegmentCount = Math.max(1, requestedSegmentCount);
            int safeSegmentSeconds = Math.max(1, requestedSegmentSeconds);
            List<Integer> startSeconds = calculateStartSeconds(videoDurationSeconds, safeSegmentCount, safeSegmentSeconds);

            for (int i = 0; i < startSeconds.size(); i++) {
                int startSecond = startSeconds.get(i);
                Path outputPath = tempDir.resolve("audio-%03d.mp3".formatted(i + 1));
                if (extractAudioSegment(sourceUrl, outputPath, startSecond, safeSegmentSeconds)) {
                    byte[] bytes = Files.readAllBytes(outputPath);
                    if (bytes.length > 0) {
                        samples.add(new AudioModerationSample(
                            startSecond,
                            bytes,
                            "clip-audio-%03d.mp3".formatted(i + 1)
                        ));
                    }
                }
            }

            return samples;
        } catch (Exception e) {
            return List.of();
        } finally {
            cleanup(tempDir);
        }
    }


    private boolean extractAudioSegment(String videoUrl, Path outputPath, int startSecond, int durationSeconds) {
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                ffmpegPath,
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-ss",
                String.valueOf(startSecond),
                "-i",
                videoUrl,
                "-t",
                String.valueOf(durationSeconds),
                "-vn",
                "-map",
                "0:a:0",
                "-ac",
                "1",
                "-ar",
                "16000",
                "-codec:a",
                "libmp3lame",
                "-b:a",
                "48k",
                outputPath.toString()
            );
            processBuilder.redirectErrorStream(true);

            Process process = processBuilder.start();
            boolean finished = process.waitFor(audioSegmentTimeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return false;
            }
            return process.exitValue() == 0 && Files.exists(outputPath) && Files.size(outputPath) > 0;
        } catch (Exception e) {
            return false;
        }
    }
}

