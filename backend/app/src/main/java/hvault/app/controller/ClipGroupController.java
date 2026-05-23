package hvault.app.controller;

import hvault.app.dto.ApiMessageResponse;
import hvault.app.dto.CreateClipGroupRequest;
import hvault.app.dto.IdMessageResponse;
import hvault.app.dto.ClipGroupResponse;
import hvault.app.dto.UpdateClipGroupRequest;
import hvault.app.security.SecurityUtil;
import hvault.app.service.ClipGroupService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clipGroups")
public class ClipGroupController {

    private final ClipGroupService clipGroupService;

    public ClipGroupController(ClipGroupService clipGroupService) {
        this.clipGroupService = clipGroupService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ClipGroupResponse>> getClipGroupsByUserId(@PathVariable Long userId, @RequestParam(required = false) String type, Authentication authentication) {
        Long currentUserId = SecurityUtil.requireCurrentUserId(authentication);
        Long targetUserId = SecurityUtil.isAdmin(authentication) ? userId : currentUserId;
        List<ClipGroupResponse> clipGroups = clipGroupService.getClipGroupsByUserId(targetUserId, type);
        return ResponseEntity.ok(clipGroups);
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClipGroupResponse> getClipGroupById(@PathVariable Long id, Authentication authentication) {
        ClipGroupResponse clipGroup = clipGroupService.getClipGroupById(
            id,
            SecurityUtil.requireCurrentUserId(authentication),
            SecurityUtil.isAdmin(authentication)
        );
        return ResponseEntity.ok(clipGroup);
    }

    @PostMapping
    public ResponseEntity<IdMessageResponse> createClipGroup(@Valid @RequestBody CreateClipGroupRequest request, Authentication authentication) {
        Long id = clipGroupService.createClipGroup(
            SecurityUtil.requireCurrentUserId(authentication),
            request.getName(),
            request.getDescription(),
            request.getType()
        );
        return ResponseEntity.ok(new IdMessageResponse("ClipGroup created successfully", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> updateClipGroup(
        @PathVariable Long id,
        @RequestBody UpdateClipGroupRequest request,
        Authentication authentication
    ) {
        clipGroupService.updateClipGroup(
            id,
            request.getName(),
            request.getDescription(),
            SecurityUtil.requireCurrentUserId(authentication),
            SecurityUtil.isAdmin(authentication)
        );
        return ResponseEntity.ok(new ApiMessageResponse("ClipGroup updated successfully"));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> deleteClipGroup(@PathVariable Long id, Authentication authentication) {
        clipGroupService.deleteClipGroup(id, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("ClipGroup deleted successfully"));
    }

    @PostMapping("/{id}/clips/{clipId}")
    public ResponseEntity<ApiMessageResponse> addClipToClipGroup(
        @PathVariable Long id,
        @PathVariable Long clipId,
        Authentication authentication
    ) {
        clipGroupService.addClipToClipGroup(id, clipId, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Clip added to clipGroup"));
    }

    @DeleteMapping("/{id}/clips/{clipId}")
    public ResponseEntity<ApiMessageResponse> removeClipFromClipGroup(
        @PathVariable Long id,
        @PathVariable Long clipId,
        Authentication authentication
    ) {
        clipGroupService.removeClipFromClipGroup(id, clipId, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Clip removed from clipGroup"));
    }
}
