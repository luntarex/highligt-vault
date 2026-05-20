package hvault.app.controller;

import java.io.IOException;
import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.client.HttpStatusCodeException;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import hvault.app.service.VideoUploadService;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {
    private final VideoUploadService videoUploadService;

    public UploadController(VideoUploadService videoUploadService) {
        this.videoUploadService = videoUploadService;
    }

    @PostMapping("/videos")
    public ResponseEntity<?> uploadVideo(@RequestPart("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(videoUploadService.uploadVideo(file));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 413) {
                return ResponseEntity.status(413).body(Map.of("error", "This file is too large. Please upload a smaller file."));
            }
            return ResponseEntity.status(502).body(Map.of("error", "Upload service is temporarily unavailable. Please try again."));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("error", "Could not read uploaded video file."));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "Video upload failed. Please try again."));
        }
    }

    @PostMapping("/images")
    public ResponseEntity<?> uploadImage(@RequestPart("file") MultipartFile file) {
        try {
            return ResponseEntity.ok(videoUploadService.uploadImage(file));
        } catch (IllegalArgumentException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        } catch (HttpStatusCodeException e) {
            if (e.getStatusCode().value() == 413) {
                return ResponseEntity.status(413).body(Map.of("error", "This image is too large. Please upload a smaller file."));
            }
            return ResponseEntity.status(502).body(Map.of("error", "Upload service is temporarily unavailable. Please try again."));
        } catch (IOException e) {
            return ResponseEntity.status(500).body(Map.of("error", "Could not read uploaded image file."));
        } catch (Exception e) {
            return ResponseEntity.status(502).body(Map.of("error", "Image upload failed. Please try again."));
        }
    }
}
