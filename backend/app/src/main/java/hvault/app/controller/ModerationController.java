package hvault.app.controller;

import hvault.app.dto.ApiMessageResponse;
import hvault.app.dto.ModerationDecisionRequest;
import hvault.app.enums.ModerationStatus;
import hvault.app.security.SecurityUtil;
import hvault.app.service.ModerationScanResult;
import hvault.app.service.ModerationService;
import hvault.app.service.CommunityService;
import hvault.app.service.ReportService;
import jakarta.validation.Valid;
import java.time.LocalDate;
import org.springframework.http.ResponseEntity;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.PostMapping;
import org.springframework.web.bind.annotation.RequestBody;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RequestParam;
import org.springframework.web.bind.annotation.RestController;

@RestController
@RequestMapping("/api/moderation")
public class ModerationController {
    private final ModerationService moderationService;
    private final ReportService reportService;
    private final CommunityService communityService;

    public ModerationController(ModerationService moderationService, ReportService reportService, CommunityService communityService) {
        this.moderationService = moderationService;
        this.reportService = reportService;
        this.communityService = communityService;
    }

    @GetMapping("/queue")
    public ResponseEntity<?> getClipQueue(
        @RequestParam(required = false) ModerationStatus status,
        @RequestParam(required = false) Integer minScore,
        @RequestParam(required = false) String category,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate fromDate,
        @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate toDate
    ) {
        return ResponseEntity.ok(moderationService.getClipQueue(status, minScore, category, fromDate, toDate));
    }

    @PostMapping("/clips/{id}/decision")
    public ResponseEntity<ApiMessageResponse> decideClip(@PathVariable Long id, @Valid @RequestBody ModerationDecisionRequest request) {
        moderationService.decideClip(id, request);
        return ResponseEntity.ok(new ApiMessageResponse("Moderation decision applied"));
    }

    @PostMapping("/clips/{id}/rescan")
    public ResponseEntity<ModerationScanResult> rescanClip(@PathVariable Long id) {
        return ResponseEntity.ok(moderationService.rescanClip(id));
    }

    @PostMapping("/clips/{id}/approve")
    public ResponseEntity<ApiMessageResponse> approveClip(@PathVariable Long id, @Valid @RequestBody ModerationDecisionRequest request) {
        request.setAction(hvault.app.enums.ModerationActionType.APPROVE);
        moderationService.decideClip(id, request);
        return ResponseEntity.ok(new ApiMessageResponse("Clip approved"));
    }

    @PostMapping("/clips/{id}/reject")
    public ResponseEntity<ApiMessageResponse> rejectClip(@PathVariable Long id, @Valid @RequestBody ModerationDecisionRequest request) {
        request.setAction(hvault.app.enums.ModerationActionType.REJECT);
        moderationService.decideClip(id, request);
        return ResponseEntity.ok(new ApiMessageResponse("Clip rejected"));
    }

    @PostMapping("/clips/{id}/remove")
    public ResponseEntity<ApiMessageResponse> removeClip(@PathVariable Long id, @Valid @RequestBody ModerationDecisionRequest request) {
        request.setAction(hvault.app.enums.ModerationActionType.REMOVE);
        moderationService.decideClip(id, request);
        return ResponseEntity.ok(new ApiMessageResponse("Clip removed"));
    }

    @PostMapping("/clips/{id}/restore")
    public ResponseEntity<ApiMessageResponse> restoreClip(@PathVariable Long id, @Valid @RequestBody ModerationDecisionRequest request) {
        request.setAction(hvault.app.enums.ModerationActionType.RESTORE);
        moderationService.decideClip(id, request);
        return ResponseEntity.ok(new ApiMessageResponse("Clip restored"));
    }

    @GetMapping("/reports")
    public ResponseEntity<?> getOpenReports() {
        return ResponseEntity.ok(reportService.getOpenReports());
    }

    @PostMapping("/reports/{id}/resolve")
    public ResponseEntity<?> resolveReport(
        @PathVariable Long id,
        @RequestParam(required = false, defaultValue = "") String resolution,
        @RequestParam(required = false, defaultValue = "false") boolean dismissed,
        Authentication authentication
    ) {
        reportService.resolveReport(id, SecurityUtil.requireCurrentUserId(authentication), resolution, dismissed);
        return ResponseEntity.ok(new ApiMessageResponse("Report resolved"));
    }

    @GetMapping("/communities")
    public ResponseEntity<?> getPendingCommunities() {
        return ResponseEntity.ok(communityService.getPendingCommunities());
    }

    @PostMapping("/communities/{id}/approve")
    public ResponseEntity<ApiMessageResponse> approveCommunity(
        @PathVariable Long id,
        @RequestParam(required = false, defaultValue = "Approved after moderator review.") String reason
    ) {
        communityService.decideCommunity(id, true, reason);
        return ResponseEntity.ok(new ApiMessageResponse("Community approved"));
    }

    @PostMapping("/communities/{id}/reject")
    public ResponseEntity<ApiMessageResponse> rejectCommunity(
        @PathVariable Long id,
        @RequestParam(required = false, defaultValue = "Rejected after moderator review.") String reason
    ) {
        communityService.decideCommunity(id, false, reason);
        return ResponseEntity.ok(new ApiMessageResponse("Community rejected"));
    }
}
