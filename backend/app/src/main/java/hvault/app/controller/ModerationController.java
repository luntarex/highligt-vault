package hvault.app.controller;

import java.util.Map;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

import hvault.app.dto.ModerationDecisionRequest;
import hvault.app.service.ModerationService;
import hvault.app.service.ReportService;
import jakarta.validation.Valid;

@RestController
@RequestMapping("/api/moderation")
public class ModerationController {
    private final ModerationService moderationService;
    private final ReportService reportService;

    public ModerationController(ModerationService moderationService, ReportService reportService) {
        this.moderationService = moderationService;
        this.reportService = reportService;
    }

    @GetMapping("/queue")
    public ResponseEntity<?> getClipQueue() {
        return ResponseEntity.ok(moderationService.getClipQueue());
    }

    @PostMapping("/clips/{id}/decision")
    public ResponseEntity<?> decideClip(@PathVariable Long id, @Valid @RequestBody ModerationDecisionRequest request) {
        moderationService.decideClip(id, request);
        return ResponseEntity.ok(Map.of("message", "Moderation decision applied"));
    }

    @PostMapping("/clips/{id}/approve")
    public ResponseEntity<?> approveClip(@PathVariable Long id, @Valid @RequestBody ModerationDecisionRequest request) {
        request.setAction(hvault.app.enums.ModerationActionType.APPROVE);
        moderationService.decideClip(id, request);
        return ResponseEntity.ok(Map.of("message", "Clip approved"));
    }

    @PostMapping("/clips/{id}/reject")
    public ResponseEntity<?> rejectClip(@PathVariable Long id, @Valid @RequestBody ModerationDecisionRequest request) {
        request.setAction(hvault.app.enums.ModerationActionType.REJECT);
        moderationService.decideClip(id, request);
        return ResponseEntity.ok(Map.of("message", "Clip rejected"));
    }

    @PostMapping("/clips/{id}/remove")
    public ResponseEntity<?> removeClip(@PathVariable Long id, @Valid @RequestBody ModerationDecisionRequest request) {
        request.setAction(hvault.app.enums.ModerationActionType.REMOVE);
        moderationService.decideClip(id, request);
        return ResponseEntity.ok(Map.of("message", "Clip removed"));
    }

    @PostMapping("/clips/{id}/restore")
    public ResponseEntity<?> restoreClip(@PathVariable Long id, @Valid @RequestBody ModerationDecisionRequest request) {
        request.setAction(hvault.app.enums.ModerationActionType.RESTORE);
        moderationService.decideClip(id, request);
        return ResponseEntity.ok(Map.of("message", "Clip restored"));
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getOpenReports() {
        return ResponseEntity.ok(reportService.getOpenReports());
    }

    @PostMapping("/reports/{id}/resolve")
    public ResponseEntity<?> resolveReport(
        @PathVariable Long id,
        @RequestParam Long reviewerId,
        @RequestParam(required = false, defaultValue = "") String resolution,
        @RequestParam(required = false, defaultValue = "false") boolean dismissed
    ) {
        reportService.resolveReport(id, reviewerId, resolution, dismissed);
        return ResponseEntity.ok(Map.of("message", "Report resolved"));
    }
}
