package hvault.app.service;

import java.io.IOException;
import java.util.Map;

import org.springframework.beans.factory.annotation.Value;
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

@Service
public class VideoUploadService {
    private final RestTemplate restTemplate = new RestTemplate();

    @Value("${cloudinary.cloud-name}")
    private String cloudName;

    @Value("${cloudinary.upload-preset}")
    private String uploadPreset;

    public VideoUploadResponse uploadVideo(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Video file is required.");
        }
        if (file.getContentType() == null || !file.getContentType().startsWith("video/")) {
            throw new IllegalArgumentException("Only video uploads are supported.");
        }

        Map<String, Object> result = upload(file, "video");

        String secureUrl = result.get("secure_url").toString();
        String publicId = result.get("public_id") != null ? result.get("public_id").toString() : null;
        String thumbnailUrl = publicId != null
            ? "https://res.cloudinary.com/" + cloudName + "/video/upload/so_1,w_400,h_300,c_fill/" + publicId + ".jpg"
            : null;

        return new VideoUploadResponse(
            secureUrl,
            publicId,
            thumbnailUrl,
            asDouble(result.get("duration")),
            asLong(result.get("bytes")),
            result.get("format") != null ? result.get("format").toString() : null
        );
    }

    public ImageUploadResponse uploadImage(MultipartFile file) throws IOException {
        if (file == null || file.isEmpty()) {
            throw new IllegalArgumentException("Image file is required.");
        }
        if (file.getContentType() == null || !file.getContentType().startsWith("image/")) {
            throw new IllegalArgumentException("Only image uploads are supported.");
        }

        Map<String, Object> result = upload(file, "image");
        return new ImageUploadResponse(
            result.get("secure_url").toString(),
            result.get("public_id") != null ? result.get("public_id").toString() : null,
            asLong(result.get("bytes")),
            result.get("format") != null ? result.get("format").toString() : null
        );
    }

    private Map<String, Object> upload(MultipartFile file, String resourceType) throws IOException {
        String uploadUrl = "https://api.cloudinary.com/v1_1/" + cloudName + "/" + resourceType + "/upload";

        MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
        body.add("file", new MultipartInputStreamFileResource(file));
        body.add("upload_preset", uploadPreset);

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
}
