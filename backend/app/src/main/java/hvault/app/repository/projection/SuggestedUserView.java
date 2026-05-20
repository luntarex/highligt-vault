package hvault.app.repository.projection;

public interface SuggestedUserView {
    Long getId();
    String getUsername();
    String getProfilePhotoUrl();
    String getDescription();
    Long getMutualCount();
    Long getFollowers();
}
