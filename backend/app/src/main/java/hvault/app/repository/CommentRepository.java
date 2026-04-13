package hvault.app.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

@Repository
public class CommentRepository {

    private final JdbcTemplate jdbcTemplate;

    public CommentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * REQUIREMENT #3 (Part 2): Edit the text of a comment.
     * Uses UPDATE.
     */
    public int updateContent(Long id, String newContent) {
        String sql = "UPDATE comments SET content = ? WHERE id = ?";
        return jdbcTemplate.update(sql, newContent, id);
    }

    /**
     * REQUIREMENT #5: Remove a comment from the system for violating terms of service.
     * Uses DELETE.
     */
    public int deleteComment(Long id) {
        String sql = "DELETE FROM comments WHERE id = ?";
        return jdbcTemplate.update(sql, id);
    }
}
