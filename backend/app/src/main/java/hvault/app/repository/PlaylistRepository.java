package hvault.app.repository;

import hvault.app.entity.Playlist;
import hvault.app.repository.projection.PlaylistClipView;
import hvault.app.repository.projection.PlaylistView;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface PlaylistRepository extends JpaRepository<Playlist, Long> {

    @Query(value = "SELECT id, name, description, user_id as userId, created_at as createdAt FROM playlists WHERE user_id = :userId ORDER BY created_at DESC", nativeQuery = true)
    List<PlaylistView> findPlaylistsByUserId(@Param("userId") Long userId);

    @Query(value = "SELECT id, name, description, user_id as userId, created_at as createdAt FROM playlists WHERE id = :id", nativeQuery = true)
    List<PlaylistView> findPlaylistRowsById(@Param("id") Long id);

    default PlaylistView findPlaylistById(Long id) {
        List<PlaylistView> rows = findPlaylistRowsById(id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Query(value = """
        SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game,
               pi.added_at AS addedAt
        FROM clips c
        JOIN playlist_items pi ON pi.clip_id = c.id
        LEFT JOIN games g ON c.game_id = g.id
        WHERE pi.playlist_id = :playlistId AND (c.is_deleted = false OR c.is_deleted IS NULL)
        ORDER BY pi.added_at DESC
        """, nativeQuery = true)
    List<PlaylistClipView> findClipsByPlaylistId(@Param("playlistId") Long playlistId);

    @Transactional
    @Modifying
    @Query(value = "UPDATE playlists SET name = :name, description = :description WHERE id = :id", nativeQuery = true)
    void updatePlaylist(@Param("id") Long id, @Param("name") String name, @Param("description") String description);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM playlist_items WHERE playlist_id = :id", nativeQuery = true)
    void deletePlaylistItems(@Param("id") Long id);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM playlists WHERE id = :id", nativeQuery = true)
    void deletePlaylistRow(@Param("id") Long id);

    @Transactional
    default void deletePlaylist(Long id) {
        deletePlaylistItems(id);
        deletePlaylistRow(id);
    }

    @Transactional
    @Modifying
    @Query(value = "INSERT IGNORE INTO playlist_items (playlist_id, clip_id) VALUES (:playlistId, :clipId)", nativeQuery = true)
    void addClipToPlaylist(@Param("playlistId") Long playlistId, @Param("clipId") Long clipId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM playlist_items WHERE playlist_id = :playlistId AND clip_id = :clipId", nativeQuery = true)
    void removeClipFromPlaylist(@Param("playlistId") Long playlistId, @Param("clipId") Long clipId);

    @Query(value = "SELECT COUNT(*) FROM playlist_items WHERE playlist_id = :playlistId AND clip_id = :clipId", nativeQuery = true)
    int countClipInPlaylist(@Param("playlistId") Long playlistId, @Param("clipId") Long clipId);

    default boolean isClipInPlaylist(Long playlistId, Long clipId) {
        return countClipInPlaylist(playlistId, clipId) > 0;
    }
}
