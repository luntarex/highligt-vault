package hvault.app.repository;

import hvault.app.entity.ClipGroup;
import hvault.app.repository.projection.ClipGroupView;
import hvault.app.repository.projection.ClipView;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ClipGroupRepository extends JpaRepository<ClipGroup, Long> {

    @Query(value = """
        SELECT cg.id, cg.user_id AS userId, cg.name, cg.description, cg.created_at AS createdAt,
               cg.type,
               (
                   SELECT COUNT(*)
                   FROM clip_group_items cgi
                   JOIN clips c ON cgi.clip_id = c.id
                   WHERE cgi.group_id = cg.id
                     AND (c.is_deleted = false OR c.is_deleted IS NULL)
                     AND (
                         COALESCE(cg.type, 'LIBRARY') <> 'FAVORITES'
                         OR EXISTS (
                             SELECT 1
                             FROM user_favorites uf
                             WHERE uf.user_id = cg.user_id AND uf.clip_id = c.id
                         )
                     )
               ) AS clipCount,
               (
                   SELECT c.thumbnail_url
                   FROM clip_group_items cgi
                   JOIN clips c ON cgi.clip_id = c.id
                   WHERE cgi.group_id = cg.id
                     AND (c.is_deleted = false OR c.is_deleted IS NULL)
                     AND (
                         COALESCE(cg.type, 'LIBRARY') <> 'FAVORITES'
                         OR EXISTS (
                             SELECT 1
                             FROM user_favorites uf
                             WHERE uf.user_id = cg.user_id AND uf.clip_id = c.id
                         )
                     )
                   ORDER BY cgi.added_at DESC
                   LIMIT 1
               ) AS thumbnailUrl
        FROM clip_groups cg
        WHERE cg.user_id = :userId
          AND (:type IS NULL OR cg.type = :type OR (:type = 'LIBRARY' AND cg.type IS NULL))
        ORDER BY cg.created_at DESC
        """, nativeQuery = true)
    List<ClipGroupView> findGroupsByUserId(@Param("userId") Long userId, @Param("type") String type);

    @Query(value = """
        SELECT cg.id, cg.user_id AS userId, cg.name, cg.description, cg.created_at AS createdAt,
               cg.type,
               (
                   SELECT COUNT(*)
                   FROM clip_group_items cgi
                   JOIN clips c ON cgi.clip_id = c.id
                   WHERE cgi.group_id = cg.id
                     AND (c.is_deleted = false OR c.is_deleted IS NULL)
                     AND (
                         COALESCE(cg.type, 'LIBRARY') <> 'FAVORITES'
                         OR EXISTS (
                             SELECT 1
                             FROM user_favorites uf
                             WHERE uf.user_id = cg.user_id AND uf.clip_id = c.id
                         )
                     )
               ) AS clipCount,
               (
                   SELECT c.thumbnail_url
                   FROM clip_group_items cgi
                   JOIN clips c ON cgi.clip_id = c.id
                   WHERE cgi.group_id = cg.id
                     AND (c.is_deleted = false OR c.is_deleted IS NULL)
                     AND (
                         COALESCE(cg.type, 'LIBRARY') <> 'FAVORITES'
                         OR EXISTS (
                             SELECT 1
                             FROM user_favorites uf
                             WHERE uf.user_id = cg.user_id AND uf.clip_id = c.id
                         )
                     )
                   ORDER BY cgi.added_at DESC
                   LIMIT 1
               ) AS thumbnailUrl
        FROM clip_groups cg
        WHERE cg.id = :id
        """, nativeQuery = true)
    List<ClipGroupView> findGroupRowsById(@Param("id") Long id);

    default ClipGroupView findGroupById(Long id) {
        List<ClipGroupView> rows = findGroupRowsById(id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Query(value = """
        SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game,
               c.uploader_id AS uploaderId, c.is_deleted AS isDeleted, c.created_at AS dateCreated,
               c.moderation_status AS moderationStatus, c.moderation_score AS moderationScore,
               c.moderation_reason AS moderationReason, c.moderation_checked_at AS moderationCheckedAt,
               c.reviewed_by AS reviewedBy, c.reviewed_at AS reviewedAt,
               c.removed_reason AS removedReason, c.removed_at AS removedAt,
               c.visibility_status AS visibilityStatus
        FROM clip_group_items cgi
        JOIN clip_groups cg ON cgi.group_id = cg.id
        JOIN clips c ON cgi.clip_id = c.id
        LEFT JOIN games g ON c.game_id = g.id
        WHERE cgi.group_id = :groupId
          AND (c.is_deleted = false OR c.is_deleted IS NULL)
          AND (
              COALESCE(cg.type, 'LIBRARY') <> 'FAVORITES'
              OR EXISTS (
                  SELECT 1
                  FROM user_favorites uf
                  WHERE uf.user_id = cg.user_id AND uf.clip_id = c.id
              )
          )
        ORDER BY cgi.added_at DESC
        """, nativeQuery = true)
    List<ClipView> findClipsByGroupId(@Param("groupId") Long groupId);

    @Transactional
    @Modifying
    @Query(value = "INSERT IGNORE INTO clip_group_items (group_id, clip_id, added_at) VALUES (:groupId, :clipId, CURRENT_TIMESTAMP)", nativeQuery = true)
    void addClipToGroup(@Param("groupId") Long groupId, @Param("clipId") Long clipId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM clip_group_items WHERE group_id = :groupId AND clip_id = :clipId", nativeQuery = true)
    void removeClipFromGroup(@Param("groupId") Long groupId, @Param("clipId") Long clipId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM clip_group_items WHERE group_id = :groupId", nativeQuery = true)
    void deleteGroupItems(@Param("groupId") Long groupId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM clip_groups WHERE id = :groupId", nativeQuery = true)
    void deleteGroupRow(@Param("groupId") Long groupId);

    @Transactional
    default void deleteGroup(Long groupId) {
        deleteGroupItems(groupId);
        deleteGroupRow(groupId);
    }

    @Query(value = """
        SELECT COUNT(*)
        FROM clips c
        WHERE c.id = :clipId
          AND (c.is_deleted = false OR c.is_deleted IS NULL)
          AND (
              c.uploader_id = :userId
              OR EXISTS (
                  SELECT 1
                  FROM user_favorites uf
                  WHERE uf.user_id = :userId AND uf.clip_id = c.id
              )
          )
        """, nativeQuery = true)
    int countAccessibleClip(@Param("clipId") Long clipId, @Param("userId") Long userId);

    @Query(value = "SELECT t.name FROM tags t JOIN clip_tags ct ON t.id = ct.tag_id WHERE ct.clip_id = :clipId", nativeQuery = true)
    List<String> getTagsForClip(@Param("clipId") Long clipId);
}
