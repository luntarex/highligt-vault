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
     * Returns the lightweight, immediately-available source delivery URL for a Cloudinary asset by
     * stripping a leading transformation segment (e.g. the eager "c_limit,w_1280,...,f_mp4" applied
     * for playback). FFmpeg sampling should read the stored original rather than the heavy transcode,
     * which may still be generating in the background when an eager_async upload returns. URLs that
     * are not Cloudinary delivery URLs, or that already point at the bare asset, are returned as-is.
     */
    public static String cloudinarySourceUrl(String videoUrl) {
        if (videoUrl == null || videoUrl.isBlank()) {
            return videoUrl;
        }
        int uploadIndex = videoUrl.indexOf("/upload/");
        if (uploadIndex < 0) {
            return videoUrl;
        }
        int segmentStart = uploadIndex + "/upload/".length();
        int segmentEnd = videoUrl.indexOf('/', segmentStart);
        if (segmentEnd < 0) {
            return videoUrl;
        }
        // A transformation segment carries comma-separated params (c_limit,w_1280,...); the public
        // id ("videos/<hash>") never does, so only strip when the leading segment looks like one.
        String firstSegment = videoUrl.substring(segmentStart, segmentEnd);
        if (!firstSegment.contains(",")) {
            return videoUrl;
        }
        return videoUrl.substring(0, segmentStart) + videoUrl.substring(segmentEnd + 1);
    }

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
