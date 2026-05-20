package hvault.app.service;

import hvault.app.dto.PostAuthorResponse;
import hvault.app.dto.PostFeedResponse;
import hvault.app.entity.Post;
import hvault.app.enums.VisibilityStatus;
import hvault.app.repository.PostRepository;
import hvault.app.repository.projection.PostDetailsView;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class PostService {
    private final PostRepository postRepository;
    private final hvault.app.repository.ClipRepository clipRepository;

    public PostService(PostRepository postRepository, hvault.app.repository.ClipRepository clipRepository) {
        this.postRepository = postRepository;
        this.clipRepository = clipRepository;
    }

    public Long createPost(Long userId, Long clipId, String caption) {
        clipRepository.updateVisibilityStatus(clipId, VisibilityStatus.PUBLIC);

        Post post = new Post();
        post.setUserId(userId);
        post.setClipId(clipId);
        post.setCaption(caption);
        post.setCreatedAt(LocalDateTime.now());
        return postRepository.save(post).getId();
    }

    public void updatePostCaption(Long id, String newCaption) {
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

    public void likePost(Long postId, Long userId) {
        postRepository.likePost(postId, userId);
    }

    public void unlikePost(Long postId, Long userId) {
        postRepository.unlikePost(postId, userId);
    }

    public void deletePostsByClipId(Long clipId) {
        postRepository.deleteByClipId(clipId);
    }

    public void deletePost(Long postId) {
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
}
