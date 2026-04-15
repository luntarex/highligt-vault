package hvault.app.repository;

import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class ClipRepository {

    private final JdbcTemplate jdbcTemplate;

    public ClipRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    /**
     * REQUIREMENT #1: List all clips that a certain user has commented on.
     * Uses JOIN linking 4 tables: comments -> posts -> clips -> games.
     */
    public List<Map<String, Object>> findClipsCommentedByUser(Long userId) {
        String sql = """
            SELECT DISTINCT c.id, c.title, c.video_url, c.thumbnail_url, c.duration,
                   c.start_time, c.end_time, g.name AS game_name
            FROM comments cm
            JOIN posts p ON cm.post_id = p.id
            JOIN clips c ON p.clip_id = c.id
            JOIN games g ON c.game_id = g.id
            WHERE cm.user_id = ?
            ORDER BY c.title ASC
            """;

        return jdbcTemplate.queryForList(sql, userId);
    }

    public List<Map<String, Object>> findAllByUserId(Long uploaderId) {
        String sql = """
            SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
                   c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game
                   c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game,
                   c.created_at AS dateCreated
            FROM clips c
            LEFT JOIN games g ON c.game_id = g.id
            WHERE c.uploader_id = ? AND (c.is_deleted = false OR c.is_deleted IS NULL)
            ORDER BY c.created_at DESC
            """;
        return jdbcTemplate.queryForList(sql, uploaderId);
    }
    public List<Map<String, Object>> findFavoritesByUserId(Long userId) {
        String sql = """
            SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
                   c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game
            FROM user_favorites uf
            JOIN clips c ON uf.clip_id = c.id
            LEFT JOIN games g ON c.game_id = g.id
            WHERE uf.user_id = ? AND (c.is_deleted = false OR c.is_deleted IS NULL)
            ORDER BY uf.created_at DESC
            """;
        return jdbcTemplate.queryForList(sql, userId);
    }
    
    public void addFavorite(Long userId, Long clipId) {
        String checkSql = "SELECT COUNT(*) FROM user_favorites WHERE user_id = ? AND clip_id = ?";
        Integer count = jdbcTemplate.queryForObject(checkSql, Integer.class, userId, clipId);
        if (count == null || count == 0) {
            jdbcTemplate.update(
                "INSERT INTO user_favorites (user_id, clip_id, created_at) VALUES (?, ?, CURRENT_TIMESTAMP)",
                userId, clipId
            );
        }
    }

    public void removeFavorite(Long userId, Long clipId) {
        jdbcTemplate.update("DELETE FROM user_favorites WHERE user_id = ? AND clip_id = ?", userId, clipId);
    }

    public boolean isFavorited(Long userId, Long clipId) {
        String sql = "SELECT COUNT(*) FROM user_favorites WHERE user_id = ? AND clip_id = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, userId, clipId);
        return count != null && count > 0;
    }

    public List<Map<String, Object>> findAllClips() {
        String sql = """
            SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
                   c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game,
                   c.created_at AS dateCreated
            FROM clips c
            LEFT JOIN games g ON c.game_id = g.id
            WHERE c.is_deleted = false OR c.is_deleted IS NULL
            ORDER BY c.created_at DESC
            """;
        return jdbcTemplate.queryForList(sql);
    }

    public Map<String, Object> findById(Long id) {
        String sql = """
            SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
                   c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game,
                   c.uploader_id AS uploaderId, c.is_public AS isPublic
            FROM clips c
            LEFT JOIN games g ON c.game_id = g.id
            WHERE c.id = ? AND (c.is_deleted = false OR c.is_deleted IS NULL)
            """;
        List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, id);
        return results.isEmpty() ? null : results.get(0);
    }

    public void softDeleteClip(Long id) {
        String sql = "UPDATE clips SET is_deleted = true WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    public void hardDeleteClip(Long id) {
        // Manually delete related entities in case ON DELETE CASCADE is missing
        List<Long> postIds = jdbcTemplate.queryForList("SELECT id FROM posts WHERE clip_id = ?", Long.class, id);
        for (Long postId : postIds) {
            jdbcTemplate.update("DELETE FROM comments WHERE post_id = ?", postId);
            jdbcTemplate.update("DELETE FROM post_likes WHERE post_id = ?", postId);
        }
        jdbcTemplate.update("DELETE FROM posts WHERE clip_id = ?", id);
        
        jdbcTemplate.update("DELETE FROM clip_tags WHERE clip_id = ?", id);
        jdbcTemplate.update("DELETE FROM playlist_items WHERE clip_id = ?", id);
        jdbcTemplate.update("DELETE FROM user_favorites WHERE clip_id = ?", id);
        
        jdbcTemplate.update("DELETE FROM clips WHERE id = ?", id);
    }

    public List<Map<String, Object>> findAllDeletedByUserId(Long uploaderId) {
        String sql = """
            SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
                   c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game
            FROM clips c
            LEFT JOIN games g ON c.game_id = g.id
            WHERE c.uploader_id = ? AND c.is_deleted = true
            ORDER BY c.created_at DESC
            """;
        return jdbcTemplate.queryForList(sql, uploaderId);
    }

    public void recoverClip(Long id) {
        String sql = "UPDATE clips SET is_deleted = false WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    public Long getGameIdByNameOrCreate(String gameName) {
        if (gameName == null || gameName.trim().isEmpty()) {
            return 1L;
        }
        String findSql = "SELECT id FROM games WHERE name = ?";
        List<Long> gameIds = jdbcTemplate.queryForList(findSql, Long.class, gameName);
        if (gameIds.isEmpty()) {
            org.springframework.jdbc.support.KeyHolder keyHolder = new org.springframework.jdbc.support.GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                java.sql.PreparedStatement ps = connection.prepareStatement("INSERT INTO games (name) VALUES (?)", java.sql.Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, gameName);
                return ps;
            }, keyHolder);
            return keyHolder.getKey().longValue();
        } else {
            return gameIds.get(0);
        }
    }

    public Long insertClip(String title, String videoUrl, String thumbnailUrl, 
                           Double duration, Double startTime, Double endTime, String notes, Long uploaderId, Long gameId, Boolean isPublic) {
        String sql = "INSERT INTO clips (title, video_url, thumbnail_url, duration, start_time, end_time, notes, uploader_id, game_id, is_public) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)";
        
        org.springframework.jdbc.support.KeyHolder keyHolder = new org.springframework.jdbc.support.GeneratedKeyHolder();
        jdbcTemplate.update(connection -> {
            java.sql.PreparedStatement ps = connection.prepareStatement(sql, java.sql.Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, title);
            ps.setString(2, videoUrl);
            ps.setString(3, thumbnailUrl);
            ps.setObject(4, duration);
            ps.setObject(5, startTime);
            ps.setObject(6, endTime);
            ps.setString(7, notes);
            ps.setObject(8, uploaderId);
            ps.setObject(9, gameId);
            ps.setObject(10, isPublic != null ? isPublic : true);
            return ps;
        }, keyHolder);
        
        return keyHolder.getKey().longValue();
    }
    
    public void updateClip(Long id, String title, String notes, Long gameId, Boolean isPublic) {
        String sql = "UPDATE clips SET title = ?, notes = ?, game_id = ?, is_public = ? WHERE id = ?";
        jdbcTemplate.update(sql, title, notes, gameId, isPublic != null ? isPublic : true, id);
    }
    
    public void clearTagsForClip(Long clipId) {
        String sql = "DELETE FROM clip_tags WHERE clip_id = ?";
        jdbcTemplate.update(sql, clipId);
    }
    
    public void insertTagIfNotExistAndLink(Long clipId, String tagName) {
        String findSql = "SELECT id FROM tags WHERE name = ?";
        List<Long> tagIds = jdbcTemplate.queryForList(findSql, Long.class, tagName);
        Long tagId;
        if (tagIds.isEmpty()) {
            org.springframework.jdbc.support.KeyHolder keyHolder = new org.springframework.jdbc.support.GeneratedKeyHolder();
            jdbcTemplate.update(connection -> {
                java.sql.PreparedStatement ps = connection.prepareStatement("INSERT INTO tags (name) VALUES (?)", java.sql.Statement.RETURN_GENERATED_KEYS);
                ps.setString(1, tagName);
                return ps;
            }, keyHolder);
            tagId = keyHolder.getKey().longValue();
        } else {
            tagId = tagIds.get(0);
        }
        
        String linkSql = "INSERT IGNORE INTO clip_tags (clip_id, tag_id) VALUES (?, ?)";
        jdbcTemplate.update(linkSql, clipId, tagId);
    }
    
    public List<String> getTagsForClip(Long clipId) {
        String sql = "SELECT t.name FROM tags t JOIN clip_tags ct ON t.id = ct.tag_id WHERE ct.clip_id = ?";
        return jdbcTemplate.queryForList(sql, String.class, clipId);
    }
}
