package hvault.app.repository;

import hvault.app.entity.ContentReport;
import hvault.app.repository.projection.ReportView;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ReportRepository extends JpaRepository<ContentReport, Long> {

    @Query(value = """
        SELECT COUNT(*)
        FROM content_reports
        WHERE reporter_id = :reporterId
          AND target_type = :targetType
          AND target_id = :targetId
          AND status IN ('OPEN', 'IN_REVIEW')
        """, nativeQuery = true)
    int countOpenByReporterAndTarget(@Param("reporterId") Long reporterId,
                                      @Param("targetType") String targetType,
                                      @Param("targetId") Long targetId);

    default boolean hasOpenReport(Long reporterId, String targetType, Long targetId) {
        return countOpenByReporterAndTarget(reporterId, targetType, targetId) > 0;
    }

    @Query(value = """
        SELECT id, reporter_id AS reporterId, target_type AS targetType, target_id AS targetId,
               reason, details, status, created_at AS createdAt,
               reviewed_by AS reviewedBy, reviewed_at AS reviewedAt, resolution
        FROM content_reports
        WHERE reporter_id = :reporterId
        ORDER BY created_at DESC
        """, nativeQuery = true)
    List<ReportView> findByReporterId(@Param("reporterId") Long reporterId);

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
    List<ReportView> findOpenReports();

    @Transactional
    @Modifying
    @Query(value = """
        UPDATE content_reports
        SET status = :status, reviewed_by = :reviewerId, reviewed_at = CURRENT_TIMESTAMP, resolution = :resolution
        WHERE id = :reportId
        """, nativeQuery = true)
    int updateReportResolution(@Param("reportId") Long reportId, @Param("reviewerId") Long reviewerId,
                               @Param("resolution") String resolution, @Param("status") String status);

    default int resolveReport(Long reportId, Long reviewerId, String resolution, boolean dismissed) {
        return updateReportResolution(reportId, reviewerId, resolution, dismissed ? "DISMISSED" : "RESOLVED");
    }
}
