package hvault.app.dto;

import jakarta.validation.constraints.NotBlank;
import lombok.Data;

@Data
public class CreateCommunityPostRequest {
    private String content;

    private Long originalPostId;
    
    private String repostType;

    private Long clipId;
}
