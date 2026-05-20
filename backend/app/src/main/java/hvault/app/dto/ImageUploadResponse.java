package hvault.app.dto;

import lombok.AllArgsConstructor;
import lombok.Data;

@Data
@AllArgsConstructor
public class ImageUploadResponse {
    private String secureUrl;
    private String publicId;
    private Long bytes;
    private String format;
}
