package hvault.app.service;

import hvault.app.dto.CommunityResponse;
import hvault.app.dto.CreateCommunityRequest;
import hvault.app.dto.UpdateCommunityRequest;
import hvault.app.entity.Community;
import hvault.app.entity.Game;
import hvault.app.enums.ModerationStatus;
import hvault.app.repository.CommunityRepository;
import hvault.app.repository.GameRepository;
import hvault.app.repository.projection.CommunityView;
import java.time.LocalDateTime;
import java.util.HashSet;
import java.util.List;
import java.util.Locale;
import java.util.NoSuchElementException;
import java.util.Set;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

@Service
public class CommunityService {
    private static final String TYPE_GAME = "GAME";
    private static final String TYPE_USER = "USER";
    private static final String FALLBACK_GAME_NAME = "Other";
    private static final String ROLE_OWNER = "OWNER";
    private static final String ROLE_ADMIN = "ADMIN";
    private static final String ROLE_MODERATOR = "MODERATOR";
    private static final String ROLE_MEMBER = "MEMBER";

    private final CommunityRepository communityRepository;
    private final GameRepository gameRepository;

    public CommunityService(CommunityRepository communityRepository, GameRepository gameRepository) {
        this.communityRepository = communityRepository;
        this.gameRepository = gameRepository;
    }

    @Transactional
    public List<CommunityResponse> getCommunities(Long viewerId, boolean includePending) {
        ensureGameCommunities();
        return communityRepository.findCommunityViews(viewerId, includePending).stream()
            .map(this::toResponse)
            .toList();
    }

    @Transactional
    public CommunityResponse getCommunity(Long communityId, Long viewerId, boolean admin) {
        ensureGameCommunities();
        CommunityView view = communityRepository.findCommunityViewById(communityId, viewerId);
        if (view == null) {
            throw new NoSuchElementException("Community not found.");
        }
        ModerationStatus status = parseStatus(view.getModerationStatus());
        if (!admin && status != ModerationStatus.APPROVED && status != ModerationStatus.AUTO_APPROVED) {
            throw new AccessDeniedException("This community is waiting for moderation.");
        }
        return toResponse(view);
    }

    @Transactional
    public Long createCommunity(CreateCommunityRequest request, Long founderId, boolean admin) {
        Community community = new Community();
        community.setName(cleanRequired(request.getName(), "Community name cannot be empty."));
        community.setDescription(cleanOptional(request.getDescription()));
        community.setRules(cleanOptional(request.getRules()));
        community.setThumbnailUrl(cleanOptional(request.getThumbnailUrl()));
        community.setType(TYPE_USER);
        community.setFounderId(founderId);
        community.setModerationStatus(admin ? ModerationStatus.APPROVED : ModerationStatus.PENDING_REVIEW);
        community.setCreatedAt(LocalDateTime.now());

        Long id = communityRepository.save(community).getId();
        communityRepository.addMember(id, founderId, ROLE_OWNER);
        return id;
    }

    @Transactional
    public void joinCommunity(Long communityId, Long userId) {
        Community community = requireCommunity(communityId);
        requireApproved(community);
        communityRepository.addMember(communityId, userId, ROLE_MEMBER);
    }

    @Transactional
    public void leaveCommunity(Long communityId, Long userId) {
        String role = communityRepository.findMemberRole(communityId, userId);
        if (ROLE_OWNER.equals(role)) {
            throw new IllegalArgumentException("Community owner cannot leave their own community.");
        }
        communityRepository.removeMember(communityId, userId);
    }

    @Transactional
    public void appointAdmin(Long communityId, Long targetUserId, Long currentUserId, boolean siteAdmin) {
        requireCommunityManager(communityId, currentUserId, siteAdmin);
        communityRepository.addMember(communityId, targetUserId, ROLE_MEMBER);
        communityRepository.updateMemberRole(communityId, targetUserId, ROLE_ADMIN);
    }

    @Transactional
    public void removeAdmin(Long communityId, Long targetUserId, Long currentUserId, boolean siteAdmin) {
        requireCommunityManager(communityId, currentUserId, siteAdmin);
        String role = communityRepository.findMemberRole(communityId, targetUserId);
        if (ROLE_OWNER.equals(role)) {
            throw new IllegalArgumentException("Community owner role cannot be changed.");
        }
        communityRepository.updateMemberRole(communityId, targetUserId, ROLE_MEMBER);
    }

    @Transactional
    public void updateThumbnail(Long communityId, String thumbnailUrl, Long currentUserId, boolean siteAdmin) {
        requireCommunity(communityId);
        requireCommunityManager(communityId, currentUserId, siteAdmin);
        communityRepository.updateThumbnail(communityId, cleanRequired(thumbnailUrl, "Thumbnail URL cannot be empty."));
    }

    @Transactional
    public CommunityResponse updateCommunity(Long communityId, UpdateCommunityRequest request, Long currentUserId, boolean siteAdmin) {
        Community community = requireCommunity(communityId);
        requireCommunityManager(communityId, currentUserId, siteAdmin);

        String name = cleanRequired(
            firstNonNull(request.getName(), community.getName()),
            "Community name cannot be empty."
        );
        String description = cleanOptional(firstNonNull(request.getDescription(), community.getDescription()));
        String thumbnailUrl = cleanOptional(firstNonNull(request.getThumbnailUrl(), community.getThumbnailUrl()));
        String rules = cleanOptional(firstNonNull(request.getRules(), community.getRules()));
        communityRepository.updateCommunity(communityId, name, description, thumbnailUrl, rules);
        return getCommunity(communityId, currentUserId, siteAdmin);
    }

    @Transactional
    public void deleteCommunity(Long communityId, Long currentUserId, boolean siteAdmin) {
        Community community = requireCommunity(communityId);
        if (TYPE_GAME.equals(community.getType())) {
            throw new IllegalArgumentException("Game communities cannot be deleted.");
        }
        requireCommunityOwnerOrSiteAdmin(community, currentUserId, siteAdmin);
        communityRepository.delete(community);
    }

    @Transactional
    public List<CommunityResponse> getPendingCommunities() {
        return communityRepository.findCommunityViews(0L, true).stream()
            .map(this::toResponse)
            .filter(item -> item.getModerationStatus() == ModerationStatus.PENDING_REVIEW
                || item.getModerationStatus() == ModerationStatus.NEEDS_MANUAL_REVIEW)
            .toList();
    }

    @Transactional
    public void decideCommunity(Long communityId, boolean approved, String reason) {
        Community community = requireCommunity(communityId);
        if (TYPE_GAME.equals(community.getType())) {
            throw new IllegalArgumentException("Game communities are automatically approved.");
        }
        communityRepository.updateModerationStatus(
            communityId,
            approved ? ModerationStatus.APPROVED.name() : ModerationStatus.REJECTED.name(),
            cleanOptional(reason)
        );
    }

    private void ensureGameCommunities() {
        Set<Long> existingGameIds = new HashSet<>(communityRepository.findCommunityGameIds());
        for (Game game : gameRepository.findAll()) {
            if (game.getId() == null || existingGameIds.contains(game.getId()) || isFallbackGame(game.getName())) {
                continue;
            }
            Community community = new Community();
            community.setName(game.getName());
            community.setDescription(game.getName() + " community");
            community.setThumbnailUrl(game.getCoverUrl());
            community.setType(TYPE_GAME);
            community.setGameId(game.getId());
            community.setModerationStatus(ModerationStatus.APPROVED);
            community.setCreatedAt(LocalDateTime.now());
            communityRepository.save(community);
        }
    }

    private boolean isFallbackGame(String gameName) {
        return gameName == null || FALLBACK_GAME_NAME.equalsIgnoreCase(gameName.trim());
    }

    private Community requireCommunity(Long communityId) {
        return communityRepository.findById(communityId)
            .orElseThrow(() -> new NoSuchElementException("Community not found."));
    }

    private void requireApproved(Community community) {
        if (community.getModerationStatus() != ModerationStatus.APPROVED
            && community.getModerationStatus() != ModerationStatus.AUTO_APPROVED) {
            throw new AccessDeniedException("This community is waiting for moderation.");
        }
    }

    private void requireCommunityManager(Long communityId, Long currentUserId, boolean siteAdmin) {
        if (siteAdmin) {
            return;
        }
        String role = communityRepository.findMemberRole(communityId, currentUserId);
        if (!ROLE_OWNER.equals(role) && !ROLE_ADMIN.equals(role) && !ROLE_MODERATOR.equals(role)) {
            throw new AccessDeniedException("Only community owners and admins can do this.");
        }
    }

    private void requireCommunityOwnerOrSiteAdmin(Community community, Long currentUserId, boolean siteAdmin) {
        if (siteAdmin) {
            return;
        }
        if (currentUserId != null && currentUserId.equals(community.getFounderId())) {
            return;
        }
        String role = communityRepository.findMemberRole(community.getId(), currentUserId);
        if (!ROLE_OWNER.equals(role)) {
            throw new AccessDeniedException("Only the community owner can delete this community.");
        }
    }

    private CommunityResponse toResponse(CommunityView view) {
        CommunityResponse response = new CommunityResponse();
        response.setId(view.getId());
        response.setName(view.getName());
        response.setDescription(view.getDescription());
        response.setThumbnailUrl(view.getThumbnailUrl());
        response.setType(view.getType());
        response.setGameId(view.getGameId());
        response.setFounderId(view.getFounderId());
        response.setFounderUsername(view.getFounderUsername());
        response.setModerationStatus(parseStatus(view.getModerationStatus()));
        response.setModerationReason(view.getModerationReason());
        response.setRules(view.getRules());
        response.setMemberCount(view.getMemberCount());
        response.setPostCount(view.getPostCount());
        response.setViewerRole(view.getViewerRole());
        response.setJoined(view.getViewerRole() != null);
        response.setCreatedAt(view.getCreatedAt());
        return response;
    }

    private ModerationStatus parseStatus(String value) {
        if (value == null || value.isBlank()) {
            return null;
        }
        return ModerationStatus.valueOf(value.trim().toUpperCase(Locale.ROOT));
    }

    private String cleanRequired(String value, String message) {
        if (value == null || value.trim().isEmpty()) {
            throw new IllegalArgumentException(message);
        }
        return value.trim();
    }

    private String cleanOptional(String value) {
        return value == null ? null : value.trim();
    }

    private String firstNonNull(String preferred, String fallback) {
        return preferred != null ? preferred : fallback;
    }
}
