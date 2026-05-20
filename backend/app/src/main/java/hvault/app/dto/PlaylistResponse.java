package hvault.app.dto;

import java.time.LocalDateTime;
import java.util.List;
import lombok.Data;

@Data
public class PlaylistResponse {
    private Long id;
    private String name;
    private String description;
    private Long userId;
    private LocalDateTime createdAt;
    private List<PlaylistClipResponse> clips;
}
