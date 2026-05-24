package hvault.app.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Comparator;
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

    @Value("${app.moderation.ffmpeg.audio-segment-count:3}")
    private int segmentCount;

    @Value("${app.moderation.ffmpeg.audio-segment-seconds:4}")
    private int segmentSeconds;

    @Value("${app.moderation.ffmpeg.timeout-seconds:20}")
    private long timeoutSeconds;

    public List<AudioModerationSample> extractAudioSamples(String videoUrl) {
        if (!enabled || videoUrl == null || videoUrl.isBlank()) {
            return List.of();
        }

        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("hvault-moderation-audio-");
            List<AudioModerationSample> samples = new ArrayList<>();
            int safeSegmentCount = Math.max(1, segmentCount);
            int safeSegmentSeconds = Math.max(1, segmentSeconds);

            for (int i = 0; i < safeSegmentCount; i++) {
                int startSecond = i * 10;
                Path outputPath = tempDir.resolve("audio-%03d.mp3".formatted(i + 1));
                if (extractAudioSegment(videoUrl, outputPath, startSecond, safeSegmentSeconds)) {
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
            boolean finished = process.waitFor(Math.min(timeoutSeconds, Duration.ofSeconds(10).toSeconds()), TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return false;
            }
            return process.exitValue() == 0 && Files.exists(outputPath) && Files.size(outputPath) > 0;
        } catch (Exception e) {
            return false;
        }
    }

    private void cleanup(Path tempDir) {
        if (tempDir == null) {
            return;
        }
        try (var paths = Files.walk(tempDir)) {
            List<Path> sortedPaths = new ArrayList<>(paths.sorted(Comparator.reverseOrder()).toList());
            for (Path path : sortedPaths) {
                Files.deleteIfExists(path);
            }
        } catch (IOException ignored) {
            // Temp audio cleanup failure should not block moderation.
        }
    }
}
