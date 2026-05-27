package hvault.app.controller;

import hvault.app.dto.AddClipGroupItemsRequest;
import hvault.app.dto.ApiMessageResponse;
import hvault.app.dto.ClipGroupDetailResponse;
import hvault.app.dto.ClipGroupResponse;
import hvault.app.dto.CreateClipGroupRequest;
import hvault.app.dto.IdMessageResponse;
import hvault.app.security.SecurityUtil;
import hvault.app.service.ClipGroupService;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/clip-groups")
public class ClipGroupController {

    private final ClipGroupService clipGroupService;

    public ClipGroupController(ClipGroupService clipGroupService) {
        this.clipGroupService = clipGroupService;
    }

    @GetMapping("/user/{userId}")
    public ResponseEntity<List<ClipGroupResponse>> getGroupsByUserId(
        @PathVariable Long userId,
        @RequestParam(required = false) String type,
        Authentication authentication
    ) {
        Long currentUserId = SecurityUtil.requireCurrentUserId(authentication);
        Long targetUserId = SecurityUtil.isAdmin(authentication) ? userId : currentUserId;
        return ResponseEntity.ok(clipGroupService.getGroupsByUserId(targetUserId, type));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ClipGroupDetailResponse> getGroupById(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(clipGroupService.getGroupById(
            id,
            SecurityUtil.requireCurrentUserId(authentication),
            SecurityUtil.isAdmin(authentication)
        ));
    }

    @PostMapping
    public ResponseEntity<IdMessageResponse> createGroup(@Valid @RequestBody CreateClipGroupRequest request, Authentication authentication) {
        Long id = clipGroupService.createGroup(
            SecurityUtil.requireCurrentUserId(authentication),
            request.getName(),
            request.getDescription(),
            request.getType(),
            request.getClipIds()
        );
        return ResponseEntity.ok(new IdMessageResponse("Group created successfully", id));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> deleteGroup(@PathVariable Long id, Authentication authentication) {
        clipGroupService.deleteGroup(id, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Group deleted successfully"));
    }

    @PostMapping("/{id}/clips")
    public ResponseEntity<ApiMessageResponse> addClipsToGroup(
        @PathVariable Long id,
        @Valid @RequestBody AddClipGroupItemsRequest request,
        Authentication authentication
    ) {
        clipGroupService.addClipsToGroup(
            id,
            request.getClipIds(),
            SecurityUtil.requireCurrentUserId(authentication),
            SecurityUtil.isAdmin(authentication)
        );
        return ResponseEntity.ok(new ApiMessageResponse("Clips added to group"));
    }

    @DeleteMapping("/{id}/clips/{clipId}")
    public ResponseEntity<ApiMessageResponse> removeClipFromGroup(
        @PathVariable Long id,
        @PathVariable Long clipId,
        Authentication authentication
    ) {
        clipGroupService.removeClipFromGroup(id, clipId, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Clip removed from group"));
    }
}
