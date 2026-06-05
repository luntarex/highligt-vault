package hvault.app.dto;

import java.util.List;

import com.fasterxml.jackson.annotation.JsonAlias;

import hvault.app.enums.VisibilityStatus;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.Data;

@Data
public class ClipCreateRequest {
    @NotBlank
    @Size(max = 100)
    private String title;

    @NotBlank
    @JsonAlias({"url", "videoUrl"})
    private String videoUrl;

    private String cloudinaryPublicId;
    private String fileHash;
    private String thumbnailUrl;
    private Double duration;
    private Double startTime;
    private Double endTime;
    private String notes;
    private Long uploaderId;
    private String game;
    private VisibilityStatus visibilityStatus;
    private List<String> tags;
}
