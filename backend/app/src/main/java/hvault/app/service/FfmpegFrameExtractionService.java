package hvault.app.service;

import static hvault.app.service.FfmpegSamplingUtils.calculateStartSeconds;
import static hvault.app.service.FfmpegSamplingUtils.cleanup;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.List;
import java.util.concurrent.TimeUnit;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class FfmpegFrameExtractionService {
    @Value("${app.moderation.ai.frame-scan.enabled:true}")
    private boolean enabled;

    @Value("${app.moderation.ffmpeg.path:ffmpeg}")
    private String ffmpegPath;

    @Value("${app.moderation.ffmpeg.frame-count:3}")
    private int frameCount;

    @Value("${app.moderation.ffmpeg.timeout-seconds:20}")
    private long timeoutSeconds;

    @Value("${app.metadata.ai.frame-scale:768}")
    private int metadataFrameScale;

    public List<String> extractFrameDataUrls(String videoUrl) {
        if (!enabled || videoUrl == null || videoUrl.isBlank()) {
            return List.of();
        }

        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("hvault-moderation-frames-");
            Path outputPattern = tempDir.resolve("frame-%03d.jpg");

            ProcessBuilder processBuilder = new ProcessBuilder(
                ffmpegPath,
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                videoUrl,
                "-vf",
                "fps=1/10,scale=512:-1",
                "-frames:v",
                String.valueOf(Math.max(1, frameCount)),
                outputPattern.toString()
            );
            processBuilder.redirectErrorStream(true);

            Process process = processBuilder.start();
            boolean finished = process.waitFor(timeoutSeconds, TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return List.of();
            }
            if (process.exitValue() != 0) {
                return List.of();
            }

            try (var stream = Files.list(tempDir)) {
                return stream
                    .filter(path -> path.getFileName().toString().toLowerCase().endsWith(".jpg"))
                    .sorted()
                    .limit(Math.max(1, frameCount))
                    .map(this::toJpegDataUrl)
                    .toList();
            }
        } catch (Exception e) {
            return List.of();
        } finally {
            cleanup(tempDir);
        }
    }

    public List<String> extractFragmentFrameDataUrls(
        String videoUrl,
        Float videoDurationSeconds,
        int requestedFragmentCount,
        int requestedFramesPerFragment,
        int requestedFragmentSeconds
    ) {
        if (!enabled || videoUrl == null || videoUrl.isBlank()) {
            return List.of();
        }

        int safeFragmentCount = Math.max(1, requestedFragmentCount);
        int safeFramesPerFragment = Math.max(1, requestedFramesPerFragment);
        int safeFragmentSeconds = Math.max(1, requestedFragmentSeconds);
        List<Integer> startSeconds = calculateStartSeconds(videoDurationSeconds, safeFragmentCount, safeFragmentSeconds);
        List<String> frames = new ArrayList<>();

        for (int i = 0; i < startSeconds.size(); i++) {
            int startSecond = startSeconds.get(i);
            frames.addAll(extractFramesFromFragment(
                videoUrl,
                startSecond,
                safeFragmentSeconds,
                safeFramesPerFragment,
                i + 1
            ));
        }

        return frames;
    }

    public boolean isAvailable() {
        try {
            Process process = new ProcessBuilder(ffmpegPath, "-version")
                .redirectErrorStream(true)
                .start();
            return process.waitFor(Math.min(timeoutSeconds, Duration.ofSeconds(5).toSeconds()), TimeUnit.SECONDS)
                && process.exitValue() == 0;
        } catch (Exception e) {
            return false;
        }
    }

    private String toJpegDataUrl(Path framePath) {
        try {
            String base64 = Base64.getEncoder().encodeToString(Files.readAllBytes(framePath));
            return "data:image/jpeg;base64," + base64;
        } catch (IOException e) {
            return "";
        }
    }

    private List<String> extractFramesFromFragment(
        String videoUrl,
        int startSecond,
        int fragmentSeconds,
        int framesPerFragment,
        int fragmentIndex
    ) {
        // Try scene-change detection first for smarter frame selection
        List<String> sceneFrames = extractFramesWithSceneDetection(
            videoUrl, startSecond, fragmentSeconds, framesPerFragment, fragmentIndex
        );
        if (!sceneFrames.isEmpty()) {
            return sceneFrames;
        }

        // Fallback to fixed-interval sampling
        return extractFramesWithFixedInterval(
            videoUrl, startSecond, fragmentSeconds, framesPerFragment, fragmentIndex
        );
    }

    private List<String> extractFramesWithSceneDetection(
        String videoUrl,
        int startSecond,
        int fragmentSeconds,
        int framesPerFragment,
        int fragmentIndex
    ) {
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("hvault-metadata-scene-frames-");
            Path outputPattern = tempDir.resolve("scene-%02d-frame-%%03d.jpg".formatted(fragmentIndex));

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
                String.valueOf(fragmentSeconds),
                "-vf",
                "select='gt(scene,0.3)',scale=" + metadataFrameScale + ":-1",
                "-vsync",
                "vfr",
                "-frames:v",
                String.valueOf(framesPerFragment),
                outputPattern.toString()
            );
            processBuilder.redirectErrorStream(true);

            Process process = processBuilder.start();
            boolean finished = process.waitFor(Math.min(timeoutSeconds, Duration.ofSeconds(10).toSeconds()), TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return List.of();
            }
            if (process.exitValue() != 0) {
                return List.of();
            }

            try (var stream = Files.list(tempDir)) {
                return stream
                    .filter(path -> path.getFileName().toString().toLowerCase().endsWith(".jpg"))
                    .sorted()
                    .limit(framesPerFragment)
                    .map(this::toJpegDataUrl)
                    .toList();
            }
        } catch (Exception e) {
            return List.of();
        } finally {
            cleanup(tempDir);
        }
    }

    private List<String> extractFramesWithFixedInterval(
        String videoUrl,
        int startSecond,
        int fragmentSeconds,
        int framesPerFragment,
        int fragmentIndex
    ) {
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("hvault-metadata-fragment-frames-");
            Path outputPattern = tempDir.resolve("fragment-%02d-frame-%%03d.jpg".formatted(fragmentIndex));
            double fps = Math.max(1.0, framesPerFragment) / Math.max(1.0, fragmentSeconds);

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
                String.valueOf(fragmentSeconds),
                "-vf",
                "fps=" + fps + ",scale=" + metadataFrameScale + ":-1",
                "-frames:v",
                String.valueOf(framesPerFragment),
                outputPattern.toString()
            );
            processBuilder.redirectErrorStream(true);

            Process process = processBuilder.start();
            boolean finished = process.waitFor(Math.min(timeoutSeconds, Duration.ofSeconds(10).toSeconds()), TimeUnit.SECONDS);
            if (!finished) {
                process.destroyForcibly();
                return List.of();
            }
            if (process.exitValue() != 0) {
                return List.of();
            }

            try (var stream = Files.list(tempDir)) {
                return stream
                    .filter(path -> path.getFileName().toString().toLowerCase().endsWith(".jpg"))
                    .sorted()
                    .limit(framesPerFragment)
                    .map(this::toJpegDataUrl)
                    .toList();
            }
        } catch (Exception e) {
            return List.of();
        } finally {
            cleanup(tempDir);
        }
    }


}
