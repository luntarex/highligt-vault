package hvault.app.service;

import java.io.IOException;
import java.nio.file.Files;
import java.nio.file.Path;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashSet;
import java.util.List;
import java.util.Set;

/**
 * Shared utilities for FFmpeg-based sampling services (frame extraction and audio extraction).
 * Consolidates the duplicated calculateStartSeconds and cleanup logic.
 */
public final class FfmpegSamplingUtils {

    private FfmpegSamplingUtils() {}

    /**
     * Calculates evenly distributed start-second positions across a video's duration,
     * respecting the segment length so no segment overshoots the end.
     */
    public static List<Integer> calculateStartSeconds(Float videoDurationSeconds, int segmentCount, int segmentSeconds) {
        if (videoDurationSeconds == null || videoDurationSeconds <= 0) {
            return fixedIntervalStartSeconds(segmentCount);
        }

        double maxStart = Math.max(0, videoDurationSeconds - segmentSeconds);
        if (maxStart == 0) {
            return List.of(0);
        }

        Set<Integer> starts = new LinkedHashSet<>();
        if (segmentCount == 1) {
            starts.add((int) Math.round(maxStart / 2.0));
        } else {
            for (int i = 0; i < segmentCount; i++) {
                double ratio = (double) i / (segmentCount - 1);
                starts.add((int) Math.round(maxStart * ratio));
            }
        }

        return new ArrayList<>(starts);
    }

    /**
     * Recursively deletes a temporary directory and all its contents.
     * Failures are silently ignored to avoid blocking the caller.
     */
    public static void cleanup(Path tempDir) {
        if (tempDir == null) {
            return;
        }
        try (var paths = Files.walk(tempDir)) {
            List<Path> sortedPaths = new ArrayList<>(paths.sorted(Comparator.reverseOrder()).toList());
            for (Path path : sortedPaths) {
                Files.deleteIfExists(path);
            }
        } catch (IOException ignored) {
            // Temp file cleanup failure should not block the caller.
        }
    }

    private static List<Integer> fixedIntervalStartSeconds(int segmentCount) {
        List<Integer> starts = new ArrayList<>();
        for (int i = 0; i < segmentCount; i++) {
            starts.add(i * 10);
        }
        return starts;
    }
}
