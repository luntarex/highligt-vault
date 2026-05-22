package hvault.app.service;

import hvault.app.dto.CommentResponse;
import hvault.app.entity.Comment;
import hvault.app.entity.Post;
import hvault.app.repository.CommentRepository;
import hvault.app.repository.PostRepository;
import hvault.app.repository.projection.CommentView;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;
import java.util.NoSuchElementException;

@Service
public class CommentService {
    private final CommentRepository commentRepository;
    private final PostRepository postRepository;

    public CommentService(CommentRepository commentRepository, PostRepository postRepository) {
        this.commentRepository = commentRepository;
        this.postRepository = postRepository;
    }

    public List<CommentResponse> getCommentsByPostId(Long postId) {
        return commentRepository.findByPostId(postId).stream().map(this::toCommentResponse).toList();
    }

    public List<CommentResponse> getCommentsByUserId(Long userId) {
        return commentRepository.findByUserId(userId).stream().map(this::toCommentResponse).toList();
    }

    public Long addComment(Long postId, Long userId, String content, Long parentCommentId) {
        if (!postRepository.existsById(postId)) {
            throw new NoSuchElementException("Post not found.");
        }
        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent(content);
        comment.setPostCommentId(parentCommentId);
        comment.setCreatedAt(LocalDateTime.now());
        return commentRepository.save(comment).getId();
    }

    public void updateCommentContent(Long id, String newContent, Long currentUserId, boolean admin) {
        Comment comment = findComment(id);
        requireCommentOwnerOrAdmin(comment, currentUserId, admin);
        commentRepository.updateContent(id, newContent);
    }

    public void deleteComment(Long id, Long currentUserId, boolean admin) {
        Comment comment = findComment(id);
        requireCommentOwnerPostOwnerOrAdmin(comment, currentUserId, admin);
        commentRepository.deleteComment(id);
    }

    public void deleteCommentViolation(Long id, Long currentUserId, boolean admin) {
        if (!admin) {
            throw new AccessDeniedException("Only admins can remove comments for policy violations.");
        }
        findComment(id);
        commentRepository.deleteForViolation(id);
    }

    private CommentResponse toCommentResponse(CommentView comment) {
        CommentResponse response = new CommentResponse();
        response.setId(comment.getId());
        response.setContent(comment.getContent());
        response.setCreatedAt(comment.getCreatedAt());
        response.setUserId(comment.getUserId());
        response.setPostId(comment.getPostId());
        response.setParentCommentId(comment.getParentCommentId());
        response.setUsername(comment.getUsername());
        response.setProfilePhoto(comment.getProfilePhoto());
        response.setPostTitle(comment.getPostTitle());
        response.setPostThumbnail(comment.getPostThumbnail());
        response.setPostVideoUrl(comment.getPostVideoUrl());
        response.setPostDuration(comment.getPostDuration());
        response.setPostStartTime(comment.getPostStartTime());
        response.setPostEndTime(comment.getPostEndTime());
        response.setPostGameName(comment.getPostGameName());
        response.setPostAuthorName(comment.getPostAuthorName());
        response.setPostAuthorPhoto(comment.getPostAuthorPhoto());
        response.setPostAuthorId(comment.getPostAuthorId());
        return response;
    }

    private Comment findComment(Long id) {
        return commentRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Comment not found."));
    }

    private void requireCommentOwnerOrAdmin(Comment comment, Long currentUserId, boolean admin) {
        if (admin || currentUserId.equals(comment.getUserId())) {
            return;
        }
        throw new AccessDeniedException("You do not have permission to modify this comment.");
    }

    private void requireCommentOwnerPostOwnerOrAdmin(Comment comment, Long currentUserId, boolean admin) {
        if (admin || currentUserId.equals(comment.getUserId()) || currentUserId.equals(getPostOwnerId(comment.getPostId()))) {
            return;
        }
        throw new AccessDeniedException("You do not have permission to delete this comment.");
    }

    private Long getPostOwnerId(Long postId) {
        return postRepository.findById(postId)
            .map(Post::getUserId)
            .orElse(null);
    }
}
