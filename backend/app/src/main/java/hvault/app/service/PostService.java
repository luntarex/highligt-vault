package hvault.app.service;

import hvault.app.dto.CreatePostResponse;
import hvault.app.dto.PostAuthorResponse;
import hvault.app.dto.PostFeedResponse;
import hvault.app.entity.Clip;
import hvault.app.entity.Community;
import hvault.app.entity.Post;
import hvault.app.enums.VisibilityStatus;
import hvault.app.repository.PostRepository;
import hvault.app.repository.CommunityRepository;
import hvault.app.repository.projection.PostDetailsView;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class PostService {
    private final PostRepository postRepository;
    private final hvault.app.repository.ClipRepository clipRepository;
    private final CommunityRepository communityRepository;
    private final ModerationScannerService moderationScannerService;

    public PostService(
        PostRepository postRepository,
        hvault.app.repository.ClipRepository clipRepository,
        CommunityRepository communityRepository,
        ModerationScannerService moderationScannerService
    ) {
        this.postRepository = postRepository;
        this.clipRepository = clipRepository;
        this.communityRepository = communityRepository;
        this.moderationScannerService = moderationScannerService;
    }

    public CreatePostResponse createPost(Long userId, Long clipId, String caption, boolean admin) {
        requireClipOwnerOrAdmin(clipId, userId, admin);
        ModerationScanResult moderationResult = moderationScannerService.scanClipForPublishing(clipId, caption);

        Post post = new Post();
        post.setUserId(userId);
        post.setClipId(clipId);
        post.setCaption(caption);
        post.setCreatedAt(LocalDateTime.now());
        Long postId = postRepository.save(post).getId();

        boolean published = moderationResult.approvedForPublicFeed();
        String message = published
            ? "Post created successfully"
            : "Post created but waiting for moderation review";

        return new CreatePostResponse(
            message,
            postId,
            published,
            moderationResult.moderationStatus(),
            moderationResult.visibilityStatus(),
            moderationResult.reason()
        );
    }

    public void updatePostCaption(Long id, String newCaption, Long currentUserId, boolean admin) {
        requirePostOwnerOrAdmin(id, currentUserId, admin);
        postRepository.updateCaption(id, newCaption);
    }

    public List<PostFeedResponse> getAllPosts() {
        return getAllPostsForUser(null);
    }

    public List<PostFeedResponse> getAllPostsForUser(Long currentUserId) {
        return postRepository.findAllPostsWithDetails().stream()
            .map(row -> toPostFeedResponse(row, currentUserId))
            .toList();
    }

    public List<PostFeedResponse> getFollowingFeed(Long userId) {
        return postRepository.findFollowingFeedPosts(userId).stream()
            .map(row -> toPostFeedResponse(row, userId))
            .toList();
    }

    public List<PostFeedResponse> getPostsByGameId(Long gameId, Long currentUserId) {
        if (gameId == null) {
            return List.of();
        }
        return postRepository.findPostsByGameId(gameId).stream()
            .map(row -> toPostFeedResponse(row, currentUserId))
            .toList();
    }

    public List<PostFeedResponse> getCommunityPosts(Long communityId, Long gameId, Long currentUserId) {
        return postRepository.findCommunityPosts(communityId, gameId).stream()
            .map(row -> toPostFeedResponse(row, currentUserId))
            .toList();
    }

    public PostFeedResponse getPostById(Long postId, Long currentUserId) {
        PostDetailsView row = postRepository.findByPostIdWithDetails(postId);
        return row == null ? null : toPostFeedResponse(row, currentUserId);
    }

    public PostFeedResponse createCommunityTextPost(Long communityId, Long userId, String content, Long originalPostId, String repostType, Long clipId, boolean admin) {
        requireCommunityMemberOrAdmin(communityId, userId, admin);

        if (clipId == null) {
            if ("SELECT".equals(repostType)) {
                // Direct repost: content can be empty
            } else {
                // Normal text post or QUOTE repost: content must not be blank
                if (content == null || content.trim().isEmpty()) {
                    throw new IllegalArgumentException("Post content cannot be empty");
                }
            }
        } else {
            requireClipOwnerOrAdmin(clipId, userId, admin);
            moderationScannerService.scanClipForPublishing(clipId, content);
        }

        Post post = new Post();
        post.setUserId(userId);
        post.setCommunityId(communityId);
        post.setCaption(content != null && !content.trim().isEmpty() ? content.trim() : null);
        post.setOriginalPostId(originalPostId);
        post.setRepostType(repostType);
        post.setClipId(clipId);
        post.setCreatedAt(LocalDateTime.now());

        Long postId = postRepository.save(post).getId();
        return getPostById(postId, userId);
    }

    public void likePost(Long postId, Long userId) {
        postRepository.likePost(postId, userId);
    }

    public void unlikePost(Long postId, Long userId) {
        postRepository.unlikePost(postId, userId);
    }

    public void deletePostsByClipId(Long clipId) {
        postRepository.deleteByClipId(clipId);
    }

    public void deletePost(Long postId, Long currentUserId, boolean admin) {
        requirePostOwnerOrAdmin(postId, currentUserId, admin);
        Long clipId = postRepository.getClipIdByPostId(postId);
        postRepository.deletePost(postId);
        if (clipId != null) {
            clipRepository.updateVisibilityStatus(clipId, VisibilityStatus.PRIVATE);
        }
    }

    public boolean hasPostForClip(Long clipId) {
        return postRepository.existsByClipId(clipId);
    }

    public PostFeedResponse getPostByClipId(Long clipId, Long currentUserId) {
        PostDetailsView row = postRepository.findByClipIdWithDetails(clipId);
        return row == null ? null : toPostFeedResponse(row, currentUserId);
    }

    private PostFeedResponse toPostFeedResponse(PostDetailsView row, Long currentUserId) {
        Long postId = row.getId();
        Long clipId = row.getClipId();

        PostFeedResponse response = new PostFeedResponse();
        response.setId(postId.toString());
        response.setClipId(clipId == null ? null : clipId.toString());
        response.setCommunityId(row.getCommunityId() == null ? null : row.getCommunityId().toString());
        response.setCommunityName(row.getCommunityName());
        response.setPostType(clipId == null ? "TEXT" : "CLIP");
        response.setTitle(row.getCaption());
        response.setGame(row.getGameName());
        response.setVideoUrl(row.getVideoUrl());
        response.setDuration(row.getDuration());
        response.setStartTime(row.getStartTime());
        response.setEndTime(row.getEndTime());
        response.setLikes(row.getLikes());
        response.setComments(row.getComments());
        response.setCreatedAt(row.getCreatedAt() != null ? row.getCreatedAt().toString() : null);
        response.setIsLiked(currentUserId != null && postRepository.isLikedByUser(postId, currentUserId));
        response.setIsFavorited(currentUserId != null && clipId != null && clipRepository.isFavorited(currentUserId, clipId));
        response.setAuthor(new PostAuthorResponse(row.getAuthorId(), row.getAuthorName(), row.getAuthorPhoto()));

        response.setRepostType(row.getRepostType());
        if (row.getOriginalPostId() != null) {
            PostDetailsView originalRow = postRepository.findByPostIdWithDetails(row.getOriginalPostId());
            if (originalRow != null) {
                // Map the original post without recursing into ITS original post
                PostFeedResponse original = new PostFeedResponse();
                original.setId(originalRow.getId().toString());
                original.setClipId(originalRow.getClipId() == null ? null : originalRow.getClipId().toString());
                original.setCommunityId(originalRow.getCommunityId() == null ? null : originalRow.getCommunityId().toString());
                original.setCommunityName(originalRow.getCommunityName());
                original.setPostType(originalRow.getClipId() == null ? "TEXT" : "CLIP");
                original.setTitle(originalRow.getCaption());
                original.setGame(originalRow.getGameName());
                original.setVideoUrl(originalRow.getVideoUrl());
                original.setDuration(originalRow.getDuration());
                original.setStartTime(originalRow.getStartTime());
                original.setEndTime(originalRow.getEndTime());
                original.setLikes(originalRow.getLikes());
                original.setComments(originalRow.getComments());
                original.setCreatedAt(originalRow.getCreatedAt() != null ? originalRow.getCreatedAt().toString() : null);
                original.setIsLiked(currentUserId != null && postRepository.isLikedByUser(originalRow.getId(), currentUserId));
                original.setIsFavorited(currentUserId != null && originalRow.getClipId() != null && clipRepository.isFavorited(currentUserId, originalRow.getClipId()));
                original.setAuthor(new PostAuthorResponse(originalRow.getAuthorId(), originalRow.getAuthorName(), originalRow.getAuthorPhoto()));
                response.setOriginalPost(original);
            }
        }

        return response;
    }

    private void requireClipOwnerOrAdmin(Long clipId, Long currentUserId, boolean admin) {
        if (admin) {
            return;
        }
        Clip clip = clipRepository.findById(clipId)
            .orElseThrow(() -> new NoSuchElementException("Clip not found."));
        if (currentUserId == null || !currentUserId.equals(clip.getUploaderId())) {
            throw new AccessDeniedException("You do not have permission to share this clip.");
        }
    }

    private void requirePostOwnerOrAdmin(Long postId, Long currentUserId, boolean admin) {
        if (admin) {
            return;
        }
        Post post = postRepository.findById(postId)
            .orElseThrow(() -> new NoSuchElementException("Post not found."));
        if (currentUserId == null || (!currentUserId.equals(post.getUserId()) && !isCommunityManagerForPost(postId, currentUserId))) {
            throw new AccessDeniedException("You do not have permission to modify this post.");
        }
    }

    private boolean isCommunityManagerForPost(Long postId, Long currentUserId) {
        Long communityId = postRepository.getCommunityIdByPostId(postId);
        if (communityId == null) {
            return false;
        }
        String role = communityRepository.findMemberRole(communityId, currentUserId);
        return "OWNER".equals(role) || "ADMIN".equals(role) || "MODERATOR".equals(role);
    }

    private void requireCommunityMemberOrAdmin(Long communityId, Long userId, boolean admin) {
        Community community = communityRepository.findById(communityId)
            .orElseThrow(() -> new NoSuchElementException("Community not found."));
        if (!admin && (userId == null || communityRepository.findMemberRole(community.getId(), userId) == null)) {
            throw new AccessDeniedException("Join this community before posting.");
        }
    }
}
