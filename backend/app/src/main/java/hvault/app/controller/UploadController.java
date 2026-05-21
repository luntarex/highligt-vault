package hvault.app.controller;

import java.io.IOException;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestPart;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.multipart.MultipartFile;

import hvault.app.dto.ImageUploadResponse;
import hvault.app.dto.VideoUploadResponse;
import hvault.app.service.VideoUploadService;

@RestController
@RequestMapping("/api/uploads")
public class UploadController {
    private final VideoUploadService videoUploadService;

    public UploadController(VideoUploadService videoUploadService) {
        this.videoUploadService = videoUploadService;
    }

    @PostMapping("/videos")
    public ResponseEntity<VideoUploadResponse> uploadVideo(@RequestPart("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(videoUploadService.uploadVideo(file));
    }

    @PostMapping("/images")
    public ResponseEntity<ImageUploadResponse> uploadImage(@RequestPart("file") MultipartFile file) throws IOException {
        return ResponseEntity.ok(videoUploadService.uploadImage(file));
    }
}
