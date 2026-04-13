package hvault.app.entity;

import lombok.Data;
import java.time.LocalDateTime;

@Data
public class User {
    private Long id;
    private String username;
    private String email;
    private String passwordHash;
    private String description;
    private String profilePhotoUrl;
    private LocalDateTime createdAt;
    private Boolean isAdmin;
}
