package hvault.app.entity;

import lombok.Data;
import java.time.LocalDateTime;
import java.util.List;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.OneToMany;
import jakarta.persistence.Table;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@Entity
@Table(name = "users")
public class User {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, unique = true, length = 50)
    private String username;

    @Column(nullable = false, unique = true, length = 100)
    private String email;

    @Column(name = "password_hash", nullable = false)
    private String passwordHash;

    @Column(columnDefinition = "TEXT")
    private String description;

    @Column(name = "profile_photo_url")
    private String profilePhotoUrl;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "isAdmin")
    private Boolean isAdmin;

    @Column(name = "isDeleted")
    private Boolean isDeleted;

    @Column(name = "trust_score")
    private Integer trustScore;

    @Column(name = "violation_count")
    private Integer violationCount;

    @Column(name = "suspended_until")
    private LocalDateTime suspendedUntil;

    @OneToMany(mappedBy = "uploader")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Clip> clips;

    @OneToMany(mappedBy = "user")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Post> posts;

    @OneToMany(mappedBy = "user")
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private List<Comment> comments;
}
