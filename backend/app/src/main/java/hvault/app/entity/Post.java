package hvault.app.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class Post {
    private Long id;
    private Long userId;
    private Long clipId;
    private String caption;
    private LocalDateTime createdAt;
}
