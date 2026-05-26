package hvault.app.dto;

import java.time.LocalDateTime;

import lombok.Data;

@Data
public class ClipGroupResponse {
    private Long id;
    private Long userId;
    private String name;
    private String description;
    private LocalDateTime createdAt;
    private Long clipCount;
    private String type;
    private String thumbnailUrl;
}
