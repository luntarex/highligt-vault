package hvault.app.repository.projection;

import java.time.LocalDateTime;

public interface CommunityView {
    Long getId();
    String getName();
    String getDescription();
    String getThumbnailUrl();
    String getType();
    Long getGameId();
    Long getFounderId();
    String getFounderUsername();
    String getModerationStatus();
    String getModerationReason();
    String getRules();
    Long getMemberCount();
    Long getPostCount();
    String getViewerRole();
    LocalDateTime getCreatedAt();
}
