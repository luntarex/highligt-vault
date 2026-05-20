package hvault.app.service;

import hvault.app.dto.CommentResponse;
import hvault.app.entity.Comment;
import hvault.app.repository.CommentRepository;
import hvault.app.repository.projection.CommentView;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.List;

@Service
public class CommentService {
    private final CommentRepository commentRepository;

    public CommentService(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    public List<CommentResponse> getCommentsByPostId(Long postId) {
        return commentRepository.findByPostId(postId).stream().map(this::toCommentResponse).toList();
    }

    public List<CommentResponse> getCommentsByUserId(Long userId) {
        return commentRepository.findByUserId(userId).stream().map(this::toCommentResponse).toList();
    }

    public Long addComment(Long postId, Long userId, String content, Long parentCommentId) {
        Comment comment = new Comment();
        comment.setPostId(postId);
        comment.setUserId(userId);
        comment.setContent(content);
        comment.setPostCommentId(parentCommentId);
        comment.setCreatedAt(LocalDateTime.now());
        return commentRepository.save(comment).getId();
    }

    public void updateCommentContent(Long id, String newContent) {
        commentRepository.updateContent(id, newContent);
    }

    public void deleteComment(Long id) {
        commentRepository.deleteComment(id);
    }

    public void deleteCommentViolation(Long id) {
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
}
