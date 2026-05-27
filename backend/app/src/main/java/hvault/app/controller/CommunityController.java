package hvault.app.controller;

import hvault.app.dto.ApiMessageResponse;
import hvault.app.dto.CommunityResponse;
import hvault.app.dto.CreateCommunityRequest;
import hvault.app.dto.CreateCommunityPostRequest;
import hvault.app.dto.IdMessageResponse;
import hvault.app.dto.PostFeedResponse;
import hvault.app.dto.UpdateCommunityRequest;
import hvault.app.dto.UpdateCommunityThumbnailRequest;
import hvault.app.security.SecurityUtil;
import hvault.app.service.CommunityService;
import hvault.app.service.PostService;
import jakarta.validation.Valid;
import java.util.List;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/communities")
public class CommunityController {
    private final CommunityService communityService;
    private final PostService postService;

    public CommunityController(CommunityService communityService, PostService postService) {
        this.communityService = communityService;
        this.postService = postService;
    }

    @GetMapping
    public ResponseEntity<List<CommunityResponse>> getCommunities(Authentication authentication) {
        return ResponseEntity.ok(communityService.getCommunities(
            SecurityUtil.requireCurrentUserId(authentication),
            SecurityUtil.isAdmin(authentication)
        ));
    }

    @GetMapping("/{id}")
    public ResponseEntity<CommunityResponse> getCommunity(@PathVariable Long id, Authentication authentication) {
        return ResponseEntity.ok(communityService.getCommunity(
            id,
            SecurityUtil.requireCurrentUserId(authentication),
            SecurityUtil.isAdmin(authentication)
        ));
    }

    @GetMapping("/{id}/posts")
    public ResponseEntity<List<PostFeedResponse>> getCommunityPosts(@PathVariable Long id, Authentication authentication) {
        Long viewerId = SecurityUtil.requireCurrentUserId(authentication);
        CommunityResponse community = communityService.getCommunity(id, viewerId, SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(postService.getCommunityPosts(community.getId(), community.getGameId(), viewerId));
    }

    @PostMapping("/{id}/posts")
    public ResponseEntity<PostFeedResponse> createCommunityPost(
        @PathVariable Long id,
        @Valid @RequestBody CreateCommunityPostRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(postService.createCommunityTextPost(
            id,
            SecurityUtil.requireCurrentUserId(authentication),
            request.getContent(),
            request.getOriginalPostId(),
            request.getRepostType(),
            request.getClipId(),
            SecurityUtil.isAdmin(authentication)
        ));
    }

    @PostMapping
    public ResponseEntity<IdMessageResponse> createCommunity(@Valid @RequestBody CreateCommunityRequest request, Authentication authentication) {
        Long id = communityService.createCommunity(
            request,
            SecurityUtil.requireCurrentUserId(authentication),
            SecurityUtil.isAdmin(authentication)
        );
        return ResponseEntity.ok(new IdMessageResponse("Community submitted successfully", id));
    }

    @PutMapping("/{id}")
    public ResponseEntity<CommunityResponse> updateCommunity(
        @PathVariable Long id,
        @RequestBody UpdateCommunityRequest request,
        Authentication authentication
    ) {
        return ResponseEntity.ok(communityService.updateCommunity(
            id,
            request,
            SecurityUtil.requireCurrentUserId(authentication),
            SecurityUtil.isAdmin(authentication)
        ));
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<ApiMessageResponse> deleteCommunity(@PathVariable Long id, Authentication authentication) {
        communityService.deleteCommunity(
            id,
            SecurityUtil.requireCurrentUserId(authentication),
            SecurityUtil.isAdmin(authentication)
        );
        return ResponseEntity.ok(new ApiMessageResponse("Community deleted"));
    }

    @PostMapping("/{id}/join")
    public ResponseEntity<ApiMessageResponse> joinCommunity(@PathVariable Long id, Authentication authentication) {
        communityService.joinCommunity(id, SecurityUtil.requireCurrentUserId(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Joined community"));
    }

    @DeleteMapping("/{id}/join")
    public ResponseEntity<ApiMessageResponse> leaveCommunity(@PathVariable Long id, Authentication authentication) {
        communityService.leaveCommunity(id, SecurityUtil.requireCurrentUserId(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Left community"));
    }

    @PostMapping("/{id}/admins/{userId}")
    public ResponseEntity<ApiMessageResponse> appointAdmin(@PathVariable Long id, @PathVariable Long userId, Authentication authentication) {
        communityService.appointAdmin(id, userId, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Community admin added"));
    }

    @DeleteMapping("/{id}/admins/{userId}")
    public ResponseEntity<ApiMessageResponse> removeAdmin(@PathVariable Long id, @PathVariable Long userId, Authentication authentication) {
        communityService.removeAdmin(id, userId, SecurityUtil.requireCurrentUserId(authentication), SecurityUtil.isAdmin(authentication));
        return ResponseEntity.ok(new ApiMessageResponse("Community admin removed"));
    }

    @PutMapping("/{id}/thumbnail")
    public ResponseEntity<ApiMessageResponse> updateThumbnail(
        @PathVariable Long id,
        @Valid @RequestBody UpdateCommunityThumbnailRequest request,
        Authentication authentication
    ) {
        communityService.updateThumbnail(
            id,
            request.getThumbnailUrl(),
            SecurityUtil.requireCurrentUserId(authentication),
            SecurityUtil.isAdmin(authentication)
        );
        return ResponseEntity.ok(new ApiMessageResponse("Community thumbnail updated"));
    }
}
