package hvault.app.repository;

import java.util.List;
import java.util.Map;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

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
            SELECT u.id, u.username, u.email, u.description, u.profile_photo_url AS profilePhotoUrl, u.created_at AS createdAt, u.isAdmin,
                   COUNT(DISTINCT p.id) AS postCount,
                   COUNT(DISTINCT CASE WHEN c.is_deleted = false OR c.is_deleted IS NULL THEN c.id END) AS totalClips,
                   COUNT(DISTINCT CASE WHEN (c.is_deleted = false OR c.is_deleted IS NULL) AND c.is_public = 1 THEN c.id END) AS publicClipCount,
                   COUNT(DISTINCT uf.clip_id) AS totalFavorites
            FROM users u
            LEFT JOIN posts p ON u.id = p.user_id
            LEFT JOIN clips c ON u.id = c.uploader_id
            LEFT JOIN user_favorites uf ON u.id = uf.user_id
            WHERE u.isDeleted = FALSE OR u.isDeleted IS NULL
            GROUP BY u.id, u.username, u.email, u.description, u.profile_photo_url, u.created_at, u.isAdmin
            ORDER BY postCount DESC
            """;
        
        return jdbcTemplate.queryForList(sql);
    }

    // New Auth Methods
    public Map<String, Object> findByUsername(String username) {
        String sql = "SELECT * FROM users WHERE username = ? AND (isDeleted = FALSE OR isDeleted IS NULL)";
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
            FROM users u WHERE u.id = ? AND (u.isDeleted = FALSE OR u.isDeleted IS NULL)
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

    public int softDeleteUser(Long id) {
        String sql = "UPDATE users SET isDeleted = TRUE WHERE id = ?";
        return jdbcTemplate.update(sql, id);
    }

    public List<Map<String, Object>> findFollowers(Long userId) {
        String sql = """
            SELECT u.id, u.username, u.profile_photo_url AS profilePhotoUrl
            FROM users u
            JOIN follows f ON u.id = f.follower_id
            WHERE f.followed_id = ? AND (u.isDeleted = FALSE OR u.isDeleted IS NULL)
            """;
        return jdbcTemplate.queryForList(sql, userId);
    }

    public List<Map<String, Object>> findFollowing(Long userId) {
        String sql = """
            SELECT u.id, u.username, u.profile_photo_url AS profilePhotoUrl
            FROM users u
            JOIN follows f ON u.id = f.followed_id
            WHERE f.follower_id = ? AND (u.isDeleted = FALSE OR u.isDeleted IS NULL)
            """;
        return jdbcTemplate.queryForList(sql, userId);
    }
    /**
     * Suggest users to follow based on "friends of friends" logic.
     * Falls back to popular users if no mutual connections found.
     * Excludes self and already-followed users.
     */
    public List<Map<String, Object>> findSuggestedUsers(Long userId) {
        // First try friends-of-friends
        String fofSql = """
            SELECT u.id, u.username, u.profile_photo_url AS profilePhotoUrl,
                   u.description,
                   COUNT(DISTINCT f2.follower_id) AS mutualCount,
                   (SELECT COUNT(*) FROM follows WHERE followed_id = u.id) AS followers
            FROM follows f1
            JOIN follows f2 ON f2.follower_id = f1.followed_id AND f2.followed_id != ?
            JOIN users u ON u.id = f2.followed_id
            WHERE f1.follower_id = ?
              AND f2.followed_id NOT IN (SELECT followed_id FROM follows WHERE follower_id = ?)
              AND (u.isDeleted = FALSE OR u.isDeleted IS NULL)
            GROUP BY u.id, u.username, u.profile_photo_url, u.description
            ORDER BY mutualCount DESC, followers DESC
            LIMIT 6
            """;
        List<Map<String, Object>> results = jdbcTemplate.queryForList(fofSql, userId, userId, userId);

        if (!results.isEmpty()) {
            return results;
        }

        // Fallback: popular users not yet followed
        String popularSql = """
            SELECT u.id, u.username, u.profile_photo_url AS profilePhotoUrl,
                   u.description,
                   0 AS mutualCount,
                   (SELECT COUNT(*) FROM follows WHERE followed_id = u.id) AS followers
            FROM users u
            WHERE u.id != ?
              AND u.id NOT IN (SELECT followed_id FROM follows WHERE follower_id = ?)
              AND (u.isDeleted = FALSE OR u.isDeleted IS NULL)
            ORDER BY followers DESC
            LIMIT 6
            """;
        return jdbcTemplate.queryForList(popularSql, userId, userId);
    }
}

