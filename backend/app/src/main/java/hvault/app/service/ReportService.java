package hvault.app.service;

import java.time.LocalDateTime;
import java.util.List;

import org.springframework.stereotype.Service;

import hvault.app.dto.CreateReportRequest;
import hvault.app.dto.ReportResponse;
import hvault.app.entity.ContentReport;
import hvault.app.enums.ReportReason;
import hvault.app.enums.ReportStatus;
import hvault.app.enums.ReportTargetType;
import hvault.app.repository.ReportRepository;
import hvault.app.repository.projection.ReportView;

@Service
public class ReportService {
    private final ReportRepository reportRepository;

    public ReportService(ReportRepository reportRepository) {
        this.reportRepository = reportRepository;
    }

    public Long createReport(CreateReportRequest request) {
        ContentReport report = new ContentReport();
        report.setReporterId(request.getReporterId());
        report.setTargetType(request.getTargetType());
        report.setTargetId(request.getTargetId());
        report.setReason(request.getReason());
        report.setDetails(request.getDetails());
        report.setStatus(ReportStatus.OPEN);
        report.setCreatedAt(LocalDateTime.now());
        return reportRepository.save(report).getId();
    }

    public List<ReportResponse> getReportsByUser(Long reporterId) {
        return reportRepository.findByReporterId(reporterId).stream().map(this::toReportResponse).toList();
    }

    public List<ReportResponse> getOpenReports() {
        return reportRepository.findOpenReports().stream().map(this::toReportResponse).toList();
    }

    public void resolveReport(Long reportId, Long reviewerId, String resolution, boolean dismissed) {
        reportRepository.resolveReport(reportId, reviewerId, resolution, dismissed);
    }

    private ReportResponse toReportResponse(ReportView report) {
        ReportResponse response = new ReportResponse();
        response.setId(report.getId());
        response.setReporterId(report.getReporterId());
        response.setTargetType(parseEnum(ReportTargetType.class, report.getTargetType()));
        response.setTargetId(report.getTargetId());
        response.setReason(parseEnum(ReportReason.class, report.getReason()));
        response.setDetails(report.getDetails());
        response.setStatus(parseEnum(ReportStatus.class, report.getStatus()));
        response.setCreatedAt(report.getCreatedAt());
        response.setReviewedBy(report.getReviewedBy());
        response.setReviewedAt(report.getReviewedAt());
        response.setResolution(report.getResolution());
        response.setReporterUsername(report.getReporterUsername());
        return response;
    }

    private <T extends Enum<T>> T parseEnum(Class<T> enumType, String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return Enum.valueOf(enumType, value);
    }
}
