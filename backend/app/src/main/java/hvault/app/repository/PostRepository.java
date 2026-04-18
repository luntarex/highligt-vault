package hvault.app.repository;

import hvault.app.entity.Post;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.stereotype.Repository;

import java.sql.PreparedStatement;
import java.sql.Statement;
import java.util.List;
import java.util.Map;

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

    public List<Map<String, Object>> findAllPostsWithDetails() {
        String sql = """
            SELECT p.id, p.caption, p.created_at, p.clip_id,
                   c.title AS clip_title, c.video_url, c.duration,
                   c.start_time AS start_time, c.end_time AS end_time,
                   g.name AS game_name,
                   u.id AS author_id, u.username AS author_name, u.profile_photo_url AS author_photo,
                   COUNT(DISTINCT pl.user_id) AS likes,
                   COUNT(DISTINCT cm.id) AS comments
            FROM posts p
            JOIN clips c ON p.clip_id = c.id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN games g ON c.game_id = g.id
            LEFT JOIN post_likes pl ON pl.post_id = p.id
            LEFT JOIN comments cm ON cm.post_id = p.id
            WHERE (c.is_deleted = false OR c.is_deleted IS NULL)
              AND (c.is_public = true)
            GROUP BY p.id, p.caption, p.created_at, p.clip_id, c.title, c.video_url, c.duration, 
                     c.start_time, c.end_time, g.name, u.id, u.username, u.profile_photo_url
            ORDER BY p.created_at DESC
            """;
        return jdbcTemplate.queryForList(sql);
    }

    /**
     * Like a post (insert into post_likes).
     */
    public void likePost(Long postId, Long userId) {
        // Avoid duplicate likes
        String checkSql = "SELECT COUNT(*) FROM post_likes WHERE post_id = ? AND user_id = ?";
        int count = jdbcTemplate.queryForObject(checkSql, Integer.class, postId, userId);
        if (count == 0) {
            String sql = "INSERT IGNORE INTO post_likes (post_id, user_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)";
            jdbcTemplate.update(sql, postId, userId);
        }
    }

    /**
     * Unlike a post (delete from post_likes).
     */
    public void unlikePost(Long postId, Long userId) {
        String sql = "DELETE FROM post_likes WHERE post_id = ? AND user_id = ?";
        jdbcTemplate.update(sql, postId, userId);
    }

    /**
     * Check if a user has liked a specific post.
     */
    public boolean isLikedByUser(Long postId, Long userId) {
        String sql = "SELECT COUNT(*) FROM post_likes WHERE post_id = ? AND user_id = ?";
        int count = jdbcTemplate.queryForObject(sql, Integer.class, postId, userId);
        return count > 0;
    }

    public void deleteByClipId(Long clipId) {
        // First delete related likes and comments for posts of this clip
        List<Long> postIds = jdbcTemplate.queryForList("SELECT id FROM posts WHERE clip_id = ?", Long.class, clipId);
        for (Long postId : postIds) {
            jdbcTemplate.update("DELETE FROM comments WHERE post_id = ?", postId);
            jdbcTemplate.update("DELETE FROM post_likes WHERE post_id = ?", postId);
        }
        jdbcTemplate.update("DELETE FROM posts WHERE clip_id = ?", clipId);
    }

    public boolean existsByClipId(Long clipId) {
        String sql = "SELECT COUNT(*) FROM posts WHERE clip_id = ?";
        int count = jdbcTemplate.queryForObject(sql, Integer.class, clipId);
        return count > 0;
    }

    /**
     * Get posts only from users that the given userId is following.
     */
    public List<Map<String, Object>> findFollowingFeedPosts(Long userId) {
        String sql = """
            SELECT p.id, p.caption, p.created_at, p.clip_id,
                   c.title AS clip_title, c.video_url, c.duration,
                   c.start_time AS start_time, c.end_time AS end_time,
                   g.name AS game_name,
                   u.id AS author_id, u.username AS author_name, u.profile_photo_url AS author_photo,
                   COUNT(DISTINCT pl.user_id) AS likes,
                   COUNT(DISTINCT cm.id) AS comments
            FROM posts p
            JOIN clips c ON p.clip_id = c.id
            JOIN users u ON p.user_id = u.id
            JOIN follows f ON f.followed_id = p.user_id AND f.follower_id = ?
            LEFT JOIN games g ON c.game_id = g.id
            LEFT JOIN post_likes pl ON pl.post_id = p.id
            LEFT JOIN comments cm ON cm.post_id = p.id
            WHERE (c.is_deleted = false OR c.is_deleted IS NULL)
              AND (c.is_public = true)
            GROUP BY p.id, p.caption, p.created_at, p.clip_id, c.title, c.video_url, c.duration,
                     c.start_time, c.end_time, g.name, u.id, u.username, u.profile_photo_url
            ORDER BY p.created_at DESC
            """;
        return jdbcTemplate.queryForList(sql, userId);
    }

    public Map<String, Object> findByClipIdWithDetails(Long clipId) {
        String sql = """
            SELECT p.id, p.caption, p.created_at, p.clip_id,
                   c.title AS clip_title, c.video_url, c.duration,
                   c.start_time AS start_time, c.end_time AS end_time,
                   g.name AS game_name,
                   u.id AS author_id, u.username AS author_name, u.profile_photo_url AS author_photo,
                   COUNT(DISTINCT pl.user_id) AS likes,
                   COUNT(DISTINCT cm.id) AS comments
            FROM posts p
            JOIN clips c ON p.clip_id = c.id
            JOIN users u ON p.user_id = u.id
            LEFT JOIN games g ON c.game_id = g.id
            LEFT JOIN post_likes pl ON pl.post_id = p.id
            LEFT JOIN comments cm ON cm.post_id = p.id
            WHERE p.clip_id = ?
            GROUP BY p.id, p.caption, p.created_at, p.clip_id, c.title, c.video_url, c.duration, 
                     c.start_time, c.end_time, g.name, u.id, u.username, u.profile_photo_url
            """;
        List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, clipId);
        return results.isEmpty() ? null : results.get(0);
    }
}
