package hvault.app.service;

import java.io.IOException;
import java.io.InputStream;
import java.nio.charset.StandardCharsets;
import java.nio.file.Files;
import java.nio.file.Path;
import java.security.MessageDigest;
import java.security.NoSuchAlgorithmException;
import java.util.Locale;
import java.util.Map;
import java.util.Optional;
import java.util.Set;
import java.util.concurrent.TimeUnit;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.FileSystemResource;
import org.springframework.core.io.InputStreamResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;
import org.springframework.web.multipart.MultipartFile;

import hvault.app.dto.ImageUploadResponse;
import hvault.app.dto.VideoUploadResponse;
import hvault.app.entity.Clip;
import hvault.app.repository.ClipRepository;

@Service
public class VideoUploadService {
    private static final Logger logger = LoggerFactory.getLogger(VideoUploadService.class);

    private final RestTemplate restTemplate = new RestTemplate();
    private final ClipRepository clipRepository;

    private static final Set<String> ALLOWED_VIDEO_EXTENSIONS = Set.of(
        "mp4",
        "m4v",
        "mov",
        "webm",
        "mkv",
        "avi",
        "wmv",
        "flv",
        "mpg",
        "mpeg",
        "3gp",
        "3g2",
        "ogv",
        "ts",
        "mts",
        "m2ts"
    );
    private static final Set<String> ALLOWED_IMAGE_EXTENSIONS = Set.of("jpg", "jpeg", "png", "webp");

    public VideoUploadService(ClipRepository clipRepository) {
        this.clipRepository = clipRepository;
    }

    @Value("${cloudinary.cloud-name}")
    private String cloudName;

    @Value("${cloudinary.upload-preset}")
    private String uploadPreset;

    @Value("${cloudinary.api-key:}")
    private String cloudinaryApiKey;

    @Value("${cloudinary.api-secret:}")
    private String cloudinaryApiSecret;

    @Value("${app.upload.video.max-bytes:104857600}")
    private long maxVideoBytes;

    @Value("${app.upload.image.max-bytes:10485760}")
    private long maxImageBytes;

    @Value("${app.upload.video.optimization.enabled:true}")
    private boolean videoOptimizationEnabled;

    @Value("${app.upload.video.optimization.required:false}")
    private boolean videoOptimizationRequired;

    @Value("${app.upload.video.optimization.ffmpeg-path:${app.moderation.ffmpeg.path:ffmpeg}}")
    private String ffmpegPath;

    @Value("${app.upload.video.optimization.timeout-seconds:120}")
    private long videoOptimizationTimeoutSeconds;

    @Value("${app.upload.video.optimization.max-width:1280}")
    private int videoOptimizationMaxWidth;

    @Value("${app.upload.video.optimization.max-height:720}")
    private int videoOptimizationMaxHeight;

    @Value("${app.upload.video.optimization.crf:28}")
    private int videoOptimizationCrf;

    @Value("${app.upload.video.optimization.preset:fast}")
    private String videoOptimizationPreset;

    public VideoUploadResponse uploadVideo(MultipartFile file) throws IOException {
        validateUpload(file, "video", maxVideoBytes, ALLOWED_VIDEO_EXTENSIONS);

        String fileHash = sha256Hex(file);
        Optional<Clip> existingClip = clipRepository.findFirstByFileHashOrderByCreatedAtDesc(fileHash);
        if (existingClip.isPresent() && hasText(existingClip.get().getVideoUrl())) {
            return existingUploadResponse(existingClip.get(), fileHash);
        }

        String publicId = "videos/" + fileHash;
        Path tempDir = null;
        try {
            tempDir = Files.createTempDirectory("hvault-video-upload-");
            Path inputPath = tempDir.resolve("source-" + safeUploadFilename(file.getOriginalFilename()));
            file.transferTo(inputPath);

            Path uploadPath = optimizedVideoPath(inputPath, tempDir);
            Map<String, Object> result = upload(uploadPath, "optimized-" + fileHash + ".mp4", "video", publicId);

            String secureUrl = result.get("secure_url").toString();
            String uploadedPublicId = result.get("public_id") != null ? result.get("public_id").toString() : publicId;
            String thumbnailUrl = thumbnailUrl(uploadedPublicId);

            return new VideoUploadResponse(
                secureUrl,
                uploadedPublicId,
                thumbnailUrl,
                fileHash,
                false,
                asDouble(result.get("duration")),
                asLong(result.get("bytes")),
                result.get("format") != null ? result.get("format").toString() : null
            );
        } finally {
            FfmpegSamplingUtils.cleanup(tempDir);
        }
    }

    public ImageUploadResponse uploadImage(MultipartFile file) throws IOException {
        validateUpload(file, "image", maxImageBytes, ALLOWED_IMAGE_EXTENSIONS);

        Map<String, Object> result = upload(file, "image");
        return new ImageUploadResponse(
            result.get("secure_url").toString(),
            result.get("public_id") != null ? result.get("public_id").toString() : null,
            asLong(result.get("bytes")),
            result.get("format") != null ? result.get("format").toString() : null
        );
    }

    private VideoUploadResponse existingUploadResponse(Clip clip, String fileHash) {
        String publicId = hasText(clip.getCloudinaryPublicId())
            ? clip.getCloudinaryPublicId()
            : publicIdFromCloudinaryUrl(clip.getVideoUrl());
        String thumbnailUrl = hasText(clip.getThumbnailUrl())
            ? clip.getThumbnailUrl()
            : thumbnailUrl(publicId);

        return new VideoUploadResponse(
            clip.getVideoUrl(),
            publicId,
            thumbnailUrl,
            fileHash,
            true,
            clip.getDuration() != null ? clip.getDuration().doubleValue() : null,
            null,
            null
        );
    }

    /**
     * Permanently removes a video asset from Cloudinary. Best-effort: requires the signed
     * admin API (cloudinary.api-key/api-secret); if those are missing or the call fails it
     * logs and returns false without throwing, so callers never break on cleanup.
     */
    public boolean deleteVideoAsset(String publicId) {
        if (!hasText(publicId)) {
            return false;
        }
        if (!hasText(cloudinaryApiKey) || !hasText(cloudinaryApiSecret)) {
            logger.warn("Skipping Cloudinary deletion for {} because cloudinary.api-key/api-secret are not configured.", publicId);
            return false;
        }

        try {
            long timestamp = System.currentTimeMillis() / 1000L;
            String signature = sha1Hex("invalidate=true&public_id=" + publicId + "&timestamp=" + timestamp + cloudinaryApiSecret);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("public_id", publicId);
            body.add("timestamp", String.valueOf(timestamp));
            body.add("invalidate", "true");
            body.add("api_key", cloudinaryApiKey);
            body.add("signature", signature);

            HttpHeaders headers = new HttpHeaders();
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            @SuppressWarnings("unchecked")
            Map<String, Object> result = restTemplate.postForObject(
                "https://api.cloudinary.com/v1_1/" + cloudName + "/video/destroy",
                new HttpEntity<>(body, headers),
                Map.class
            );

            String outcome = result != null && result.get("result") != null ? result.get("result").toString() : "unknown";
            if ("ok".equals(outcome)) {
                logger.info("Deleted Cloudinary video asset {}", publicId);
                return true;
            }
            logger.warn("Cloudinary deletion for {} returned '{}'", publicId, outcome);
            return false;
        } catch (Exception e) {
            logger.warn("Cloudinary deletion failed for {}: {}", publicId, e.getMessage());
            return false;
        }
    }

    private void validateUpload(MultipartFile file, String expectedType, long maxBytes, Set<String> allowedExtensions) {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException(capitalize(expectedType) + " file is required.");
        }
        if (file.getSize() > maxBytes) {
            throw new IllegalArgumentException("This file is too large. Please upload a smaller file.");
        }
        String contentType = file.getContentType();
        String extension = extensionOf(file.getOriginalFilename());
        boolean allowedByContentType = hasExpectedContentType(contentType, expectedType);
        boolean allowedByExtension = !extension.isBlank() && allowedExtensions.contains(extension);
        if (expectedType.equals("video")) {
            if (!allowedByContentType && !(isGenericContentType(contentType) && allowedByExtension)) {
                throw new IllegalArgumentException("Only video uploads are supported.");
            }
            return;
        }
        if (!allowedByContentType || !allowedByExtension) {
            throw new IllegalArgumentException("Unsupported " + expectedType + " file type.");
        }
    }

    private String extensionOf(String filename) {
        if (filename == null) {
            return "";
        }
        int dotIndex = filename.lastIndexOf('.');
        if (dotIndex < 0 || dotIndex == filename.length() - 1) {
            return "";
        }
        return filename.substring(dotIndex + 1).toLowerCase(Locale.ROOT);
    }

    private boolean hasExpectedContentType(String contentType, String expectedType) {
        return contentType != null
            && contentType.toLowerCase(Locale.ROOT).startsWith(expectedType + "/");
    }

    private boolean isGenericContentType(String contentType) {
        if (contentType == null || contentType.isBlank()) {
            return true;
        }
        String normalized = contentType.toLowerCase(Locale.ROOT);
        return normalized.equals("application/octet-stream")
            || normalized.equals("binary/octet-stream");
    }

    private String capitalize(String value) {
        return value == null || value.isBlank()
            ? ""
            : value.substring(0, 1).toUpperCase(Locale.ROOT) + value.substring(1);
    }

    private Map<String, Object> upload(MultipartFile file, String resourceType) throws IOException {
        return upload(new MultipartInputStreamFileResource(file), resourceType, null);
    }

    private Map<String, Object> upload(Path filePath, String filename, String resourceType, String publicId) {
        return upload(new NamedFileSystemResource(filePath, filename), resourceType, publicId);
    }

    private Map<String, Object> upload(Object fileResource, String resourceType, String publicId) {
        String uploadUrl = "https://api.cloudinary.com/v1_1/" + cloudName + "/" + resourceType + "/upload";

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", fileResource);
        body.add("upload_preset", uploadPreset);
        if (hasText(publicId)) {
            body.add("public_id", publicId);
            body.add("unique_filename", "false");
            // Note: 'overwrite' is rejected by Cloudinary on unsigned uploads (HTTP 400).
            // Deduplication is already enforced via the file-hash lookup before uploading.
        }

        HttpHeaders headers = new HttpHeaders();
        headers.setContentType(MediaType.MULTIPART_FORM_DATA);

        @SuppressWarnings("unchecked")
        Map<String, Object> result = restTemplate.postForObject(
            uploadUrl,
            new HttpEntity<>(body, headers),
            Map.class
        );

        if (result == null || result.get("secure_url") == null) {
            throw new IllegalStateException("Cloudinary did not return a secure upload URL.");
        }

        return result;
    }

    private String sha256Hex(MultipartFile file) throws IOException {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-256");
            byte[] buffer = new byte[8192];
            try (InputStream inputStream = file.getInputStream()) {
                int read;
                while ((read = inputStream.read(buffer)) != -1) {
                    digest.update(buffer, 0, read);
                }
            }
            return toHex(digest.digest());
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-256 digest is not available.", e);
        }
    }

    private String toHex(byte[] bytes) {
        StringBuilder hex = new StringBuilder(bytes.length * 2);
        for (byte value : bytes) {
            hex.append(String.format("%02x", value));
        }
        return hex.toString();
    }

    private String sha1Hex(String value) {
        try {
            MessageDigest digest = MessageDigest.getInstance("SHA-1");
            return toHex(digest.digest(value.getBytes(StandardCharsets.UTF_8)));
        } catch (NoSuchAlgorithmException e) {
            throw new IllegalStateException("SHA-1 digest is not available.", e);
        }
    }

    private Path optimizedVideoPath(Path inputPath, Path tempDir) throws IOException {
        if (!videoOptimizationEnabled) {
            return inputPath;
        }

        Path outputPath = tempDir.resolve("optimized.mp4");
        try {
            ProcessBuilder processBuilder = new ProcessBuilder(
                ffmpegPath,
                "-hide_banner",
                "-loglevel",
                "error",
                "-y",
                "-i",
                inputPath.toString(),
                "-map",
                "0:v:0",
                "-map",
                "0:a?",
                "-vf",
                "scale=w='min(" + videoOptimizationMaxWidth + ",iw)':h='min(" + videoOptimizationMaxHeight + ",ih)':force_original_aspect_ratio=decrease:force_divisible_by=2,fps=30",
                "-c:v",
                "libx264",
                "-preset",
                videoOptimizationPreset,
                "-crf",
                String.valueOf(videoOptimizationCrf),
                "-pix_fmt",
                "yuv420p",
                "-movflags",
                "+faststart",
                "-c:a",
                "aac",
                "-b:a",
                "128k",
                "-map_metadata",
                "-1",
                outputPath.toString()
            );
            processBuilder.redirectErrorStream(true);

            Process process = processBuilder.start();
            boolean finished = process.waitFor(
                Math.max(1, videoOptimizationTimeoutSeconds),
                TimeUnit.SECONDS
            );
            if (!finished) {
                process.destroyForcibly();
                return handleOptimizationFailure(inputPath, "Video optimization timed out.");
            }
            if (process.exitValue() != 0 || !Files.exists(outputPath) || Files.size(outputPath) == 0) {
                return handleOptimizationFailure(inputPath, "Video optimization failed.");
            }
            if (Files.size(outputPath) >= Files.size(inputPath)) {
                return inputPath;
            }
            return outputPath;
        } catch (InterruptedException e) {
            Thread.currentThread().interrupt();
            return handleOptimizationFailure(inputPath, "Video optimization was interrupted.");
        } catch (IOException e) {
            if (videoOptimizationRequired) {
                throw e;
            }
            return inputPath;
        }
    }

    private Path handleOptimizationFailure(Path inputPath, String message) {
        if (videoOptimizationRequired) {
            throw new IllegalStateException(message);
        }
        return inputPath;
    }

    private String safeUploadFilename(String filename) {
        String safeName = filename == null || filename.isBlank() ? "upload.mp4" : filename;
        safeName = safeName.replaceAll("[^A-Za-z0-9._-]", "_");
        return safeName.isBlank() ? "upload.mp4" : safeName;
    }

    private String thumbnailUrl(String publicId) {
        return hasText(publicId)
            ? "https://res.cloudinary.com/" + cloudName + "/video/upload/so_1,w_400,h_300,c_fill/" + publicId + ".jpg"
            : null;
    }

    private String publicIdFromCloudinaryUrl(String videoUrl) {
        if (!hasText(videoUrl)) {
            return null;
        }
        String marker = "/video/upload/";
        int uploadIndex = videoUrl.indexOf(marker);
        if (uploadIndex < 0) {
            return null;
        }
        String path = videoUrl.substring(uploadIndex + marker.length());
        path = path.replaceFirst("^v\\d+/", "");
        int dotIndex = path.lastIndexOf('.');
        return dotIndex > 0 ? path.substring(0, dotIndex) : path;
    }

    private boolean hasText(String value) {
        return value != null && !value.isBlank();
    }

    private Double asDouble(Object value) {
        return value == null ? null : Double.valueOf(value.toString());
    }

    private Long asLong(Object value) {
        return value == null ? null : Long.valueOf(value.toString());
    }

    private static class MultipartInputStreamFileResource extends InputStreamResource {
        private final String filename;
        private final long contentLength;

        MultipartInputStreamFileResource(MultipartFile file) throws IOException {
            super(file.getInputStream());
            this.filename = file.getOriginalFilename();
            this.contentLength = file.getSize();
        }

        @Override
        public String getFilename() {
            return filename;
        }

        @Override
        public long contentLength() {
            return contentLength;
        }
    }

    private static class NamedFileSystemResource extends FileSystemResource {
        private final String filename;

        NamedFileSystemResource(Path path, String filename) {
            super(path);
            this.filename = filename;
        }

        @Override
        public String getFilename() {
            return filename;
        }
    }
}
