package hvault.app.entity;

import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import java.time.LocalDateTime;
import lombok.Data;

@Data
@Entity
@Table(name = "clip_metadata_examples")
public class ClipMetadataExample {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Column(name = "user_id", nullable = false)
    private Long userId;

    @Column(name = "source_clip_id", nullable = false)
    private Long sourceClipId;

    @Column(name = "game_name", length = 100)
    private String gameName;

    @Column(nullable = false, length = 100)
    private String title;

    @Column(columnDefinition = "TEXT")
    private String notes;

    @Column(length = 255)
    private String tags;

    @Column(name = "approved_at")
    private LocalDateTime approvedAt;
}
