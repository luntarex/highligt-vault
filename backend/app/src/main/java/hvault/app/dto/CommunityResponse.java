package hvault.app.dto;

import hvault.app.enums.ModerationStatus;
import java.time.LocalDateTime;
import lombok.Data;

@Data
public class CommunityResponse {
    private Long id;
    private String name;
    private String description;
    private String thumbnailUrl;
    private String type;
    private Long gameId;
    private Long founderId;
    private String founderUsername;
    private ModerationStatus moderationStatus;
    private String moderationReason;
    private String rules;
    private Long memberCount;
    private Long postCount;
    private Boolean joined;
    private String viewerRole;
    private LocalDateTime createdAt;
}
