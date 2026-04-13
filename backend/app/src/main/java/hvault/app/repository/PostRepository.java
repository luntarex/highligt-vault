package hvault.app.repository;

import hvault.app.entity.Post;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;

@Repository
public class PostRepository {

    private final JdbcTemplate jdbcTemplate;

    public PostRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * REQUIREMENT #4: Add a new post.
     * Uses INSERT.
     */
    public Long insertPost(Post post) {
        String sql = "INSERT INTO posts (user_id, clip_id, caption, created_at) VALUES (?, ?, ?, CURRENT_TIMESTAMP)";
        
        KeyHolder keyHolder = new GeneratedKeyHolder();
        
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, post.getUserId());
            ps.setLong(2, post.getClipId());
            ps.setString(3, post.getCaption());
            return ps;
        }, keyHolder);
        
        return keyHolder.getKey() != null ? keyHolder.getKey().longValue() : null;
    }

    /**
     * REQUIREMENT #3 (Part 1): Edit the text of a post.
     * Uses UPDATE.
     */
    public int updateCaption(Long id, String newCaption) {
        String sql = "UPDATE posts SET caption = ? WHERE id = ?";
        return jdbcTemplate.update(sql, newCaption, id);
    }

    public java.util.List<java.util.Map<String, Object>> findAllPostsWithDetails() {
        String sql = """
            SELECT p.id, p.caption, p.created_at,
                   c.title AS clip_title, c.video_url, c.duration,
                   g.name AS game_name,
                   u.id AS author_id, u.username AS author_name, u.profile_photo_url AS author_photo,
                   (SELECT COUNT(*) FROM post_likes pl WHERE pl.post_id = p.id) AS likes,
                   (SELECT COUNT(*) FROM comments cm WHERE cm.post_id = p.id) AS comments
            FROM posts p
            JOIN clips c ON p.clip_id = c.id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN games g ON c.game_id = g.id
            ORDER BY p.created_at DESC
            """;
        return jdbcTemplate.queryForList(sql);
    }
}
