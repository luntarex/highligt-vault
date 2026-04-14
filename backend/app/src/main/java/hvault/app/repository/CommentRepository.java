package hvault.app.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

@Repository
public class CommentRepository {

    private final JdbcTemplate jdbcTemplate;

    public CommentRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * Get all comments for a specific post, including the username of the commenter.
     */
    public List<Map<String, Object>> findByPostId(Long postId) {
        String sql = """
            SELECT c.id, c.content, c.created_at, c.user_id AS userId, c.post_id AS postId,
                   c.post_comment_id AS parentCommentId,
                   u.username
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.post_id = ?
            ORDER BY c.created_at DESC
            """;
        return jdbcTemplate.queryForList(sql, postId);
    }

    /**
     * Get all comments made by a specific user.
     */
    public List<Map<String, Object>> findByUserId(Long userId) {
        String sql = """
            SELECT c.id, c.content, c.created_at, c.user_id AS userId, c.post_id AS postId,
                   c.post_comment_id AS parentCommentId,
                   u.username
            FROM comments c
            JOIN users u ON c.user_id = u.id
            WHERE c.user_id = ?
            ORDER BY c.created_at DESC
            """;
        return jdbcTemplate.queryForList(sql, userId);
    }

    /**
     * Insert a new comment and return its generated ID.
     */
    public Long insertComment(Long postId, Long userId, String content, Long parentCommentId) {
        String sql = "INSERT INTO comments (post_id, user_id, content, post_comment_id, created_at) VALUES (?, ?, ?, ?, CURRENT_TIMESTAMP)";

        KeyHolder keyHolder = new GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, postId);
            ps.setLong(2, userId);
            ps.setString(3, content);
            if (parentCommentId != null) {
                ps.setLong(4, parentCommentId);
            } else {
                ps.setNull(4, java.sql.Types.BIGINT);
            }
            return ps;
        }, keyHolder);

        return keyHolder.getKey() != null ? keyHolder.getKey().longValue() : null;
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
