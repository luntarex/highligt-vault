package hvault.app.dto;

import java.time.LocalDateTime;
import lombok.Data;

@Data
public class PlaylistClipResponse {
    private Long id;
    private String title;
    private String url;
    private String thumbnailUrl;
    private Double duration;
    private Double startTime;
    private Double endTime;
    private String notes;
    private String game;
    private LocalDateTime addedAt;
}
