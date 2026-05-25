package hvault.app.controller;

import hvault.app.dto.IdMessageResponse;
import hvault.app.security.SecurityUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
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
    public ResponseEntity<IdMessageResponse> createReport(@Valid @RequestBody CreateReportRequest request, Authentication authentication) {
        Long id = reportService.createReport(request, SecurityUtil.requireCurrentUserId(authentication));
        return ResponseEntity.ok(new IdMessageResponse("Report created successfully", id));
    }

    @GetMapping("/my")
    public ResponseEntity<?> getMyReports(Authentication authentication) {
        return ResponseEntity.ok(reportService.getReportsByUser(SecurityUtil.requireCurrentUserId(authentication)));
    }
}
