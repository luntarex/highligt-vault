package hvault.app.service;

import hvault.app.dto.CreatePostResponse;
import hvault.app.dto.PostAuthorResponse;
import hvault.app.dto.PostFeedResponse;
import hvault.app.entity.Clip;
import hvault.app.entity.Post;
import hvault.app.enums.VisibilityStatus;
import hvault.app.repository.PostRepository;
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
    private final ModerationScannerService moderationScannerService;

    public PostService(
        PostRepository postRepository,
        hvault.app.repository.ClipRepository clipRepository,
        ModerationScannerService moderationScannerService
    ) {
        this.postRepository = postRepository;
        this.clipRepository = clipRepository;
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

    public PostFeedResponse getPostById(Long postId, Long currentUserId) {
        PostDetailsView row = postRepository.findByPostIdWithDetails(postId);
        return row == null ? null : toPostFeedResponse(row, currentUserId);
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
        if (clipId != null) {
            postRepository.deletePost(postId);
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
        response.setClipId(clipId.toString());
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
        response.setIsFavorited(currentUserId != null && clipRepository.isFavorited(currentUserId, clipId));
        response.setAuthor(new PostAuthorResponse(row.getAuthorId(), row.getAuthorName(), row.getAuthorPhoto()));
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
        if (currentUserId == null || !currentUserId.equals(post.getUserId())) {
            throw new AccessDeniedException("You do not have permission to modify this post.");
        }
    }
}
