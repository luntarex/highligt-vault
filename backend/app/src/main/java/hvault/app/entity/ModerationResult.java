package hvault.app.entity;

import java.time.LocalDateTime;

import hvault.app.enums.ReportTargetType;
import jakarta.persistence.Column;
import jakarta.persistence.Entity;
import jakarta.persistence.EnumType;
import jakarta.persistence.Enumerated;
import jakarta.persistence.GeneratedValue;
import jakarta.persistence.GenerationType;
import jakarta.persistence.Id;
import jakarta.persistence.Table;
import lombok.Data;

@Data
@Entity
@Table(name = "moderation_results")
public class ModerationResult {
    @Id
    @GeneratedValue(strategy = GenerationType.IDENTITY)
    private Long id;

    @Enumerated(EnumType.STRING)
    @Column(name = "target_type", nullable = false, length = 30)
    private ReportTargetType targetType;

    @Column(name = "target_id", nullable = false)
    private Long targetId;

    @Column(length = 50)
    private String provider;

    @Column(length = 50)
    private String category;

    private Float score;
    private Boolean flagged;

    @Column(name = "raw_result", columnDefinition = "JSON")
    private String rawResult;

    @Column(name = "created_at")
    private LocalDateTime createdAt;
}
