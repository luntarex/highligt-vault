package hvault.app.dto;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;

@Data
public class ClipGroupResponse {
    private Long id;
    private String name;
    private String description;
    private Long userId;
    private LocalDateTime createdAt;
    private String type;
    private String thumbnailUrl;
    private List<ClipGroupClipResponse> clips;
}
