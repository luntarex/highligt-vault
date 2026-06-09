package hvault.app.repository.projection;

public interface AuthUserView {
    Long getId();
    String getUsername();
    Integer getTokenVersion();
}
