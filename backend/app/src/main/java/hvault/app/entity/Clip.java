package hvault.app.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Clip {
    private Long id;
    private String title;
    private String videoUrl;
    private String thumbnailUrl;
    private Float duration;
    private Float startTime;
    private Float endTime;
    private String notes;
    private Boolean isFavorite;
    private Boolean isDeleted;
    private Boolean isPublic;
    private LocalDateTime createdAt;
    private Long uploaderId;
    private Long gameId;
}
