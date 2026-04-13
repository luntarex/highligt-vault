package hvault.app.service;

import hvault.app.repository.CommentRepository;
import org.springframework.stereotype.Service;

@Service
public class CommentService {
    private final CommentRepository commentRepository;

    public CommentService(CommentRepository commentRepository) {
        this.commentRepository = commentRepository;
    }

    public void updateCommentContent(Long id, String newContent) {
        commentRepository.updateContent(id, newContent);
    }

    public void deleteCommentViolation(Long id) {
        commentRepository.deleteComment(id);
    }
}
