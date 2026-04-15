package hvault.app.repository;

import hvault.app.entity.User;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class UserRepository {

    private final JdbcTemplate jdbcTemplate;

    public UserRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * REQUIREMENT #2: List all users and how many posts they have made.
     * Uses COUNT and GROUP BY.
     */
    public List<Map<String, Object>> findAllUsersWithPostCount() {
        String sql = """
            SELECT u.id, u.username, u.email, u.profile_photo_url AS profilePhotoUrl, u.created_at AS createdAt, u.isAdmin,
                   COUNT(p.id) AS postCount,
                   (SELECT COUNT(*) FROM clips c WHERE c.uploader_id = u.id AND (c.is_deleted = false OR c.is_deleted IS NULL)) AS totalClips,
                   (SELECT COUNT(*) FROM clips c WHERE c.uploader_id = u.id AND c.is_public = 1 AND (c.is_deleted = false OR c.is_deleted IS NULL)) AS publicClipCount,
                   (SELECT COUNT(*) FROM user_favorites uf WHERE uf.user_id = u.id) AS totalFavorites
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            GROUP BY u.id, u.username, u.email, u.profile_photo_url, u.created_at, u.isAdmin
            ORDER BY postCount DESC
            """;
        
        return jdbcTemplate.queryForList(sql);
    }

    // New Auth Methods
    public Map<String, Object> findByUsername(String username) {
        String sql = "SELECT * FROM users WHERE username = ?";
        List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, username);
        return results.isEmpty() ? null : results.get(0);
    }

    public void insertUser(String username, String email, String passwordHash) {
        String sql = "INSERT INTO users (username, email, password_hash, profile_photo_url, isAdmin) VALUES (?, ?, ?, 'https://i.pravatar.cc/150?img=1', FALSE)";
        jdbcTemplate.update(sql, username, email, passwordHash);
    }

    public Map<String, Object> findById(Long id) {
        String sql = """
            SELECT 
                u.id, 
                u.username, 
                u.email, 
                u.description, 
                u.profile_photo_url AS profilePhotoUrl, 
                u.isAdmin, 
                u.created_at AS createdAt,
                (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) AS followers,
                (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) AS following,
                (SELECT COUNT(*) FROM clips c WHERE c.uploader_id = u.id AND (c.is_deleted = false OR c.is_deleted IS NULL)) AS totalClips,
                (SELECT COUNT(*) FROM user_favorites uf WHERE uf.user_id = u.id) AS totalFavorites
            FROM users u WHERE u.id = ?
            """;
        List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, id);
        return results.isEmpty() ? null : results.get(0);
    }

    public void followUser(Long followerId, Long followedId) {
        String sql = "INSERT INTO follows (follower_id, followed_id) VALUES (?, ?)";
        try {
            jdbcTemplate.update(sql, followerId, followedId);
        } catch (Exception e) {
            // Ignore if already following
        }
    }

    public void unfollowUser(Long followerId, Long followedId) {
        String sql = "DELETE FROM follows WHERE follower_id = ? AND followed_id = ?";
        jdbcTemplate.update(sql, followerId, followedId);
    }

    public boolean isFollowing(Long followerId, Long followedId) {
        String sql = "SELECT COUNT(*) FROM follows WHERE follower_id = ? AND followed_id = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, followerId, followedId);
        return count != null && count > 0;
    }


    public int updateProfile(Long id, String username, String description, String profilePhotoUrl) {
        String sql = "UPDATE users SET username = ?, description = ?, profile_photo_url = ? WHERE id = ?";
        return jdbcTemplate.update(sql, username, description, profilePhotoUrl, id);
    }
}
