package hvault.app.dto;

import lombok.Data;

@Data
public class UpdateCommunityRequest {
    private String name;
    private String description;
    private String thumbnailUrl;
    private String rules;
}
