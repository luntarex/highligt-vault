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
public class PlaylistRepository {

    private final JdbcTemplate jdbcTemplate;

    public PlaylistRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    public List<Map<String, Object>> findPlaylistsByUserId(Long userId) {
        String sql = "SELECT id, name, description, user_id as userId, created_at as createdAt FROM playlists WHERE user_id = ? ORDER BY created_at DESC";
        return jdbcTemplate.queryForList(sql, userId);
    }

    public Map<String, Object> findPlaylistById(Long id) {
        String sql = "SELECT id, name, description, user_id as userId, created_at as createdAt FROM playlists WHERE id = ?";
        List<Map<String, Object>> results = jdbcTemplate.queryForList(sql, id);
        return results.isEmpty() ? null : results.get(0);
    }

    public List<Map<String, Object>> findClipsByPlaylistId(Long playlistId) {
        String sql = """
            SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
                   c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game, 
                   pi.added_at AS addedAt
            FROM clips c
            JOIN playlist_items pi ON pi.clip_id = c.id
            LEFT JOIN games g ON c.game_id = g.id
            WHERE pi.playlist_id = ? AND (c.is_deleted = false OR c.is_deleted IS NULL)
            ORDER BY pi.added_at DESC
            """;
        return jdbcTemplate.queryForList(sql, playlistId);
    }

    public Long createPlaylist(Long userId, String name, String description) {
        String sql = "INSERT INTO playlists (user_id, name, description) VALUES (?, ?, ?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setLong(1, userId);
            ps.setString(2, name);
            ps.setString(3, description);
            return ps;
        }, keyHolder);
        
        return keyHolder.getKey().longValue();
    }

    public void updatePlaylist(Long id, String name, String description) {
        String sql = "UPDATE playlists SET name = ?, description = ? WHERE id = ?";
        jdbcTemplate.update(sql, name, description, id);
    }

    public void deletePlaylist(Long id) {
        String sql = "DELETE FROM playlists WHERE id = ?";
        jdbcTemplate.update(sql, id);
    }

    public void addClipToPlaylist(Long playlistId, Long clipId) {
        String sql = "INSERT IGNORE INTO playlist_items (playlist_id, clip_id) VALUES (?, ?)";
        jdbcTemplate.update(sql, playlistId, clipId);
    }

    public void removeClipFromPlaylist(Long playlistId, Long clipId) {
        String sql = "DELETE FROM playlist_items WHERE playlist_id = ? AND clip_id = ?";
        jdbcTemplate.update(sql, playlistId, clipId);
    }

    public boolean isClipInPlaylist(Long playlistId, Long clipId) {
        String sql = "SELECT COUNT(*) FROM playlist_items WHERE playlist_id = ? AND clip_id = ?";
        Integer count = jdbcTemplate.queryForObject(sql, Integer.class, playlistId, clipId);
        return count != null && count > 0;
    }
}
