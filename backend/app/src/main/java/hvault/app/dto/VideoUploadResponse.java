package hvault.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class VideoUploadResponse {
    private String secureUrl;
    private String publicId;
    private String thumbnailUrl;
    private String fileHash;
    private boolean reused;
    private Double duration;
    private Long bytes;
    private String format;
}
