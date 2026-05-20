package hvault.app.entity;

import lombok.Data;
import java.time.LocalDateTime;

import hvault.app.enums.ModerationStatus;
import hvault.app.enums.VisibilityStatus;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.JoinColumn;
import jakarta.persistence.ManyToOne;
import jakarta.persistence.Table;
import jakarta.persistence.Transient;
import lombok.EqualsAndHashCode;
import lombok.ToString;

@Data
@Entity
@Table(name = "clips")
public class Clip {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(name = "video_url", nullable = false)
    private String videoUrl;

    @Column(name = "thumbnail_url")
    private String thumbnailUrl;

    private Float duration;

    @Column(name = "start_time")
    private Float startTime;

    @Column(name = "end_time")
    private Float endTime;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Transient
    private Boolean isFavorite;

    @Column(name = "is_deleted")
    private Boolean isDeleted;

    @Column(name = "created_at")
    private LocalDateTime createdAt;

    @Column(name = "uploader_id")
    private Long uploaderId;

    @Column(name = "game_id")
    private Long gameId;

    @ManyToOne
    @JoinColumn(name = "uploader_id", insertable = false, updatable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User uploader;

    @ManyToOne
    @JoinColumn(name = "game_id", insertable = false, updatable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private Game game;

    @Enumerated(EnumType.STRING)
    @Column(name = "moderation_status", length = 30)
    private ModerationStatus moderationStatus;

    @Column(name = "moderation_score")
    private Integer moderationScore;

    @Column(name = "moderation_reason", columnDefinition = "TEXT")
    private String moderationReason;

    @Column(name = "moderation_checked_at")
    private LocalDateTime moderationCheckedAt;

    @Column(name = "reviewed_by")
    private Long reviewedBy;

    @ManyToOne
    @JoinColumn(name = "reviewed_by", insertable = false, updatable = false)
    @ToString.Exclude
    @EqualsAndHashCode.Exclude
    private User reviewer;

    @Column(name = "reviewed_at")
    private LocalDateTime reviewedAt;

    @Column(name = "removed_reason", columnDefinition = "TEXT")
    private String removedReason;

    @Column(name = "removed_at")
    private LocalDateTime removedAt;

    @Enumerated(EnumType.STRING)
    @Column(name = "visibility_status", length = 30)
    private VisibilityStatus visibilityStatus;
}
