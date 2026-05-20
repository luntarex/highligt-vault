package hvault.app.repository;

import hvault.app.entity.ContentReport;
import java.util.List;
import java.util.Map;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ReportRepository extends JpaRepository<ContentReport, Long> {

    @Query(value = """
        SELECT id, reporter_id AS reporterId, target_type AS targetType, target_id AS targetId,
               reason, details, status, created_at AS createdAt,
               reviewed_by AS reviewedBy, reviewed_at AS reviewedAt, resolution
        FROM content_reports
        WHERE reporter_id = :reporterId
        ORDER BY created_at DESC
        """, nativeQuery = true)
    List<Map<String, Object>> findByReporterId(@Param("reporterId") Long reporterId);

    @Query(value = """
        SELECT cr.id, cr.reporter_id AS reporterId, cr.target_type AS targetType,
               cr.target_id AS targetId, cr.reason, cr.details, cr.status,
               cr.created_at AS createdAt, cr.reviewed_by AS reviewedBy,
               cr.reviewed_at AS reviewedAt, cr.resolution,
               u.username AS reporterUsername
        FROM content_reports cr
        LEFT JOIN users u ON cr.reporter_id = u.id
        WHERE cr.status IN ('OPEN', 'IN_REVIEW')
        ORDER BY cr.created_at ASC
        """, nativeQuery = true)
    List<Map<String, Object>> findOpenReports();

    @Transactional
    @Modifying
    @Query(value = """
        UPDATE content_reports
        SET status = :status, reviewed_by = :reviewerId, reviewed_at = CURRENT_TIMESTAMP, resolution = :resolution
        WHERE id = :reportId
        """, nativeQuery = true)
    void updateReportResolution(@Param("reportId") Long reportId, @Param("reviewerId") Long reviewerId,
                                @Param("resolution") String resolution, @Param("status") String status);

    default void resolveReport(Long reportId, Long reviewerId, String resolution, boolean dismissed) {
        updateReportResolution(reportId, reviewerId, resolution, dismissed ? "DISMISSED" : "RESOLVED");
    }
}
