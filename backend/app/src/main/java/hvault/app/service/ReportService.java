package hvault.app.service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Map;

import org.springframework.stereotype.Service;

import hvault.app.dto.CreateReportRequest;
import hvault.app.entity.ContentReport;
import hvault.app.enums.ReportStatus;
import hvault.app.repository.ReportRepository;

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

    public List<Map<String, Object>> getReportsByUser(Long reporterId) {
        return reportRepository.findByReporterId(reporterId);
    }

    public List<Map<String, Object>> getOpenReports() {
        return reportRepository.findOpenReports();
    }

    public void resolveReport(Long reportId, Long reviewerId, String resolution, boolean dismissed) {
        reportRepository.resolveReport(reportId, reviewerId, resolution, dismissed);
    }
}
