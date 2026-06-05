package hvault.app.dto;

import lombok.Data;

@Data
public class ClipMetadataSuggestionRequest {
    private String fileName;
    private String relativePath;
    private String videoUrl;
    private String thumbnailUrl;
    private Double duration;
    private String language;
}
