package hvault.app.repository;

import hvault.app.entity.ClipGroup;
import hvault.app.repository.projection.ClipGroupClipView;
import hvault.app.repository.projection.ClipGroupView;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ClipGroupRepository extends JpaRepository<ClipGroup, Long> {

    @Query(value = "SELECT g.id, g.name, g.description, g.user_id as userId, g.created_at as createdAt, g.type, " +
                   "(SELECT c.thumbnail_url FROM clips c JOIN clip_group_items cgi ON c.id = cgi.clip_id WHERE cgi.group_id = g.id ORDER BY cgi.added_at DESC LIMIT 1) as thumbnailUrl " +
                   "FROM clip_groups g WHERE g.user_id = :userId ORDER BY g.created_at DESC", nativeQuery = true)
    List<ClipGroupView> findClipGroupsByUserId(@Param("userId") Long userId);

    @Query(value = "SELECT g.id, g.name, g.description, g.user_id as userId, g.created_at as createdAt, g.type, " +
                   "(SELECT c.thumbnail_url FROM clips c JOIN clip_group_items cgi ON c.id = cgi.clip_id WHERE cgi.group_id = g.id ORDER BY cgi.added_at DESC LIMIT 1) as thumbnailUrl " +
                   "FROM clip_groups g WHERE g.id = :id", nativeQuery = true)
    List<ClipGroupView> findClipGroupRowsById(@Param("id") Long id);

    default ClipGroupView findClipGroupById(Long id) {
        List<ClipGroupView> rows = findClipGroupRowsById(id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Query(value = """
        SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game,
               pi.added_at AS addedAt
        FROM clips c
        JOIN clip_group_items pi ON pi.clip_id = c.id
        LEFT JOIN games g ON c.game_id = g.id
        WHERE pi.group_id = :clipGroupId AND (c.is_deleted = false OR c.is_deleted IS NULL)
        ORDER BY pi.added_at DESC
        """, nativeQuery = true)
    List<ClipGroupClipView> findClipsByClipGroupId(@Param("clipGroupId") Long clipGroupId);

    @Transactional
    @Modifying
    @Query(value = "UPDATE clip_groups SET name = :name, description = :description WHERE id = :id", nativeQuery = true)
    void updateClipGroup(@Param("id") Long id, @Param("name") String name, @Param("description") String description);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM clip_group_items WHERE group_id = :id", nativeQuery = true)
    void deleteClipGroupItems(@Param("id") Long id);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM clip_groups WHERE id = :id", nativeQuery = true)
    void deleteClipGroupRow(@Param("id") Long id);

    @Transactional
    default void deleteClipGroup(Long id) {
        deleteClipGroupItems(id);
        deleteClipGroupRow(id);
    }

    @Transactional
    @Modifying
    @Query(value = "INSERT IGNORE INTO clip_group_items (group_id, clip_id) VALUES (:clipGroupId, :clipId)", nativeQuery = true)
    void addClipToClipGroup(@Param("clipGroupId") Long clipGroupId, @Param("clipId") Long clipId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM clip_group_items WHERE group_id = :clipGroupId AND clip_id = :clipId", nativeQuery = true)
    void removeClipFromClipGroup(@Param("clipGroupId") Long clipGroupId, @Param("clipId") Long clipId);

    @Query(value = "SELECT COUNT(*) FROM clip_group_items WHERE group_id = :clipGroupId AND clip_id = :clipId", nativeQuery = true)
    int countClipInClipGroup(@Param("clipGroupId") Long clipGroupId, @Param("clipId") Long clipId);

    default boolean isClipInClipGroup(Long clipGroupId, Long clipId) {
        return countClipInClipGroup(clipGroupId, clipId) > 0;
    }
}
