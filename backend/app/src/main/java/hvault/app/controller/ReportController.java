package hvault.app.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import hvault.app.dto.CreateReportRequest;
import hvault.app.service.ReportService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/reports")
public class ReportController {
    private final ReportService reportService;

    public ReportController(ReportService reportService) {
        this.reportService = reportService;
    }

    @PostMapping
    public ResponseEntity<?> createReport(@Valid @RequestBody CreateReportRequest request) {
        Long id = reportService.createReport(request);
        return ResponseEntity.ok(Map.of("message", "Report created successfully", "id", id));
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyReports(@RequestParam Long reporterId) {
        return ResponseEntity.ok(reportService.getReportsByUser(reporterId));
    }
}
