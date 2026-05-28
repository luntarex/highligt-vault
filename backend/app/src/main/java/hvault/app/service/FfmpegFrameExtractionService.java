package hvault.app.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.time.Duration;
import java.util.ArrayList;
import java.util.Base64;
import java.util.Comparator;
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
                "fps=" + fps + ",scale=512:-1",
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

    private List<Integer> calculateStartSeconds(Float videoDurationSeconds, int safeFragmentCount, int safeFragmentSeconds) {
        if (videoDurationSeconds == null || videoDurationSeconds <= 0) {
            return fixedIntervalStartSeconds(safeFragmentCount);
        }

        double maxStart = Math.max(0, videoDurationSeconds - safeFragmentSeconds);
        if (maxStart == 0) {
            return List.of(0);
        }

        List<Integer> starts = new ArrayList<>();
        if (safeFragmentCount == 1) {
            starts.add((int) Math.round(maxStart / 2.0));
        } else {
            for (int i = 0; i < safeFragmentCount; i++) {
                double ratio = (double) i / (safeFragmentCount - 1);
                starts.add((int) Math.round(maxStart * ratio));
            }
        }

        return starts.stream().distinct().toList();
    }

    private List<Integer> fixedIntervalStartSeconds(int safeFragmentCount) {
        List<Integer> starts = new ArrayList<>();
        for (int i = 0; i < safeFragmentCount; i++) {
            starts.add(i * 10);
        }
        return starts;
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
            // Temp frame cleanup failure should not block moderation.
        }
    }
}
