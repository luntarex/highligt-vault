package hvault.app.service;

import hvault.app.repository.CommentRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class CommentService {
    private final CommentRepository commentRepository;

    public CommentService(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    public List<Map<String, Object>> getCommentsByPostId(Long postId) {
        return commentRepository.findByPostId(postId);
    }

    public List<Map<String, Object>> getCommentsByUserId(Long userId) {
        return commentRepository.findByUserId(userId);
    }

    public Long addComment(Long postId, Long userId, String content, Long parentCommentId) {
        return commentRepository.insertComment(postId, userId, content, parentCommentId);
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
}
