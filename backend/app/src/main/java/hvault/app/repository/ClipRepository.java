package hvault.app.repository;

import hvault.app.entity.Clip;
import hvault.app.enums.VisibilityStatus;
import hvault.app.repository.projection.ClipView;
import hvault.app.repository.projection.CommentedClipView;
import hvault.app.repository.projection.ModerationQueueItemView;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface ClipRepository extends JpaRepository<Clip, Long> {

    @Query(value = """
        SELECT DISTINCT c.id, c.title, c.video_url, c.thumbnail_url, c.duration,
               c.start_time AS startTime, c.end_time AS endTime, g.name AS gameName
        FROM comments cm
        JOIN posts p ON cm.post_id = p.id
        JOIN clips c ON p.clip_id = c.id
        JOIN games g ON c.game_id = g.id
        WHERE cm.user_id = :userId
        ORDER BY c.title ASC
        """, nativeQuery = true)
    List<CommentedClipView> findClipsCommentedByUser(@Param("userId") Long userId);

    @Query(value = """
        SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game,
               c.is_deleted AS isDeleted, c.created_at AS dateCreated,
               c.moderation_status AS moderationStatus, c.moderation_score AS moderationScore,
               c.moderation_reason AS moderationReason, c.moderation_checked_at AS moderationCheckedAt,
               c.reviewed_by AS reviewedBy, c.reviewed_at AS reviewedAt,
               c.removed_reason AS removedReason, c.removed_at AS removedAt,
               c.visibility_status AS visibilityStatus
        FROM clips c
        LEFT JOIN games g ON c.game_id = g.id
        WHERE c.uploader_id = :uploaderId AND (c.is_deleted = false OR c.is_deleted IS NULL)
        ORDER BY c.created_at DESC
        """, nativeQuery = true)
    List<ClipView> findAllByUserId(@Param("uploaderId") Long uploaderId);

    @Query(value = """
        SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game,
               c.is_deleted AS isDeleted,
               c.moderation_status AS moderationStatus, c.visibility_status AS visibilityStatus
        FROM user_favorites uf
        JOIN clips c ON uf.clip_id = c.id
        LEFT JOIN games g ON c.game_id = g.id
        WHERE uf.user_id = :userId
          AND (c.is_deleted = false OR c.is_deleted IS NULL)
          AND c.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
          AND c.visibility_status = 'PUBLIC'
        ORDER BY uf.created_at DESC
        """, nativeQuery = true)
    List<ClipView> findFavoritesByUserId(@Param("userId") Long userId);

    @Transactional
    @Modifying
    @Query(value = "INSERT IGNORE INTO user_favorites (user_id, clip_id, created_at) VALUES (:userId, :clipId, CURRENT_TIMESTAMP)", nativeQuery = true)
    void addFavorite(@Param("userId") Long userId, @Param("clipId") Long clipId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM user_favorites WHERE user_id = :userId AND clip_id = :clipId", nativeQuery = true)
    void removeFavorite(@Param("userId") Long userId, @Param("clipId") Long clipId);

    @Query(value = "SELECT COUNT(*) FROM user_favorites WHERE user_id = :userId AND clip_id = :clipId", nativeQuery = true)
    int countFavorite(@Param("userId") Long userId, @Param("clipId") Long clipId);

    default boolean isFavorited(Long userId, Long clipId) {
        return countFavorite(userId, clipId) > 0;
    }

    @Query(value = """
        SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game,
               c.is_deleted AS isDeleted, c.created_at AS dateCreated,
               c.moderation_status AS moderationStatus, c.moderation_score AS moderationScore,
               c.moderation_reason AS moderationReason, c.moderation_checked_at AS moderationCheckedAt,
               c.reviewed_by AS reviewedBy, c.reviewed_at AS reviewedAt,
               c.removed_reason AS removedReason, c.removed_at AS removedAt,
               c.visibility_status AS visibilityStatus
        FROM clips c
        LEFT JOIN games g ON c.game_id = g.id
        WHERE c.is_deleted = false OR c.is_deleted IS NULL
        ORDER BY c.created_at DESC
        """, nativeQuery = true)
    List<ClipView> findAllClips();

    @Query(value = """
        SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game,
               c.uploader_id AS uploaderId, c.is_deleted AS isDeleted,
               c.moderation_status AS moderationStatus, c.moderation_score AS moderationScore,
               c.moderation_reason AS moderationReason, c.moderation_checked_at AS moderationCheckedAt,
               c.reviewed_by AS reviewedBy, c.reviewed_at AS reviewedAt,
               c.removed_reason AS removedReason, c.removed_at AS removedAt,
               c.visibility_status AS visibilityStatus
        FROM clips c
        LEFT JOIN games g ON c.game_id = g.id
        WHERE c.id = :id AND (c.is_deleted = false OR c.is_deleted IS NULL)
        """, nativeQuery = true)
    List<ClipView> findClipRowsById(@Param("id") Long id);

    default ClipView findClipDetailsById(Long id) {
        List<ClipView> rows = findClipRowsById(id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Transactional
    @Modifying
    @Query(value = "UPDATE clips SET is_deleted = true, visibility_status = 'REMOVED' WHERE id = :id", nativeQuery = true)
    void softDeleteClip(@Param("id") Long id);

    @Query(value = "SELECT id FROM posts WHERE clip_id = :clipId", nativeQuery = true)
    List<Long> findPostIdsByClipId(@Param("clipId") Long clipId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM comments WHERE post_id = :postId", nativeQuery = true)
    void deleteCommentsByPostId(@Param("postId") Long postId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM post_likes WHERE post_id = :postId", nativeQuery = true)
    void deletePostLikesByPostId(@Param("postId") Long postId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM posts WHERE clip_id = :clipId", nativeQuery = true)
    void deletePostsByClipId(@Param("clipId") Long clipId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM clip_tags WHERE clip_id = :clipId", nativeQuery = true)
    void deleteClipTags(@Param("clipId") Long clipId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM playlist_items WHERE clip_id = :clipId", nativeQuery = true)
    void deletePlaylistItemsByClipId(@Param("clipId") Long clipId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM user_favorites WHERE clip_id = :clipId", nativeQuery = true)
    void deleteFavoritesByClipId(@Param("clipId") Long clipId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM clips WHERE id = :clipId", nativeQuery = true)
    void deleteClipRow(@Param("clipId") Long clipId);

    @Transactional
    default void hardDeleteClip(Long id) {
        for (Long postId : findPostIdsByClipId(id)) {
            deleteCommentsByPostId(postId);
            deletePostLikesByPostId(postId);
        }
        deletePostsByClipId(id);
        deleteClipTags(id);
        deletePlaylistItemsByClipId(id);
        deleteFavoritesByClipId(id);
        deleteClipRow(id);
    }

    @Query(value = """
        SELECT c.id, c.title, c.video_url AS url, c.thumbnail_url AS thumbnailUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime, c.notes, g.name AS game
        FROM clips c
        LEFT JOIN games g ON c.game_id = g.id
        WHERE c.uploader_id = :uploaderId AND c.is_deleted = true
        ORDER BY c.created_at DESC
        """, nativeQuery = true)
    List<ClipView> findAllDeletedByUserId(@Param("uploaderId") Long uploaderId);

    @Transactional
    @Modifying
    @Query(value = "UPDATE clips SET is_deleted = false, visibility_status = 'PRIVATE' WHERE id = :id", nativeQuery = true)
    void recoverClip(@Param("id") Long id);

    @Transactional
    @Modifying
    @Query(value = """
        UPDATE clips
        SET title = :title, notes = :notes, game_id = :gameId,
            moderation_status = :moderationStatus, visibility_status = :visibilityStatus,
            moderation_reason = NULL, reviewed_by = NULL, reviewed_at = NULL
        WHERE id = :id
        """, nativeQuery = true)
    void updateClipFields(@Param("id") Long id, @Param("title") String title, @Param("notes") String notes,
                          @Param("gameId") Long gameId, @Param("moderationStatus") String moderationStatus,
                          @Param("visibilityStatus") String visibilityStatus);

    default void updateClip(Long id, String title, String notes, Long gameId, VisibilityStatus visibilityStatus) {
        VisibilityStatus finalVisibilityStatus = visibilityStatus != null ? visibilityStatus : VisibilityStatus.PRIVATE;
        String moderationStatus = finalVisibilityStatus == VisibilityStatus.PUBLIC ? "AUTO_APPROVED" : "DRAFT";
        updateClipFields(id, title, notes, gameId, moderationStatus, finalVisibilityStatus.name());
    }

    @Transactional
    @Modifying
    @Query(value = """
        UPDATE clips
        SET visibility_status = :visibilityStatus,
            moderation_status = CASE
                WHEN :visibilityStatus = 'PUBLIC' THEN 'AUTO_APPROVED'
                ELSE moderation_status
            END
        WHERE id = :clipId
        """, nativeQuery = true)
    void updateVisibilityStatusValue(@Param("clipId") Long clipId, @Param("visibilityStatus") String visibilityStatus);

    default void updateVisibilityStatus(Long clipId, VisibilityStatus visibilityStatus) {
        VisibilityStatus finalVisibilityStatus = visibilityStatus != null ? visibilityStatus : VisibilityStatus.PRIVATE;
        updateVisibilityStatusValue(clipId, finalVisibilityStatus.name());
    }

    @Query(value = """
        SELECT c.id AS clipId, c.title, c.video_url AS videoUrl, c.thumbnail_url AS thumbnailUrl,
               c.uploader_id AS uploaderId, u.username AS uploaderUsername,
               c.moderation_status AS moderationStatus, c.moderation_score AS moderationScore,
               c.moderation_reason AS moderationReason, c.visibility_status AS visibilityStatus,
               c.created_at AS createdAt
        FROM clips c
        LEFT JOIN users u ON c.uploader_id = u.id
        WHERE (c.is_deleted = false OR c.is_deleted IS NULL)
          AND c.moderation_status IN ('PENDING_REVIEW', 'NEEDS_MANUAL_REVIEW', 'APPEALED')
        ORDER BY c.created_at ASC
        """, nativeQuery = true)
    List<ModerationQueueItemView> findModerationQueue();

    @Transactional
    @Modifying
    @Query(value = """
        UPDATE clips
        SET moderation_status = 'APPROVED', visibility_status = 'PUBLIC', moderation_reason = :reason,
            reviewed_by = :moderatorId, reviewed_at = CURRENT_TIMESTAMP, removed_reason = NULL, removed_at = NULL
        WHERE id = :clipId
        """, nativeQuery = true)
    void approveClip(@Param("clipId") Long clipId, @Param("moderatorId") Long moderatorId, @Param("reason") String reason);

    @Transactional
    @Modifying
    @Query(value = """
        UPDATE clips
        SET moderation_status = 'REJECTED', visibility_status = 'HIDDEN', moderation_reason = :reason,
            reviewed_by = :moderatorId, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = :clipId
        """, nativeQuery = true)
    void rejectClip(@Param("clipId") Long clipId, @Param("moderatorId") Long moderatorId, @Param("reason") String reason);

    @Transactional
    @Modifying
    @Query(value = """
        UPDATE clips
        SET moderation_status = 'REMOVED', visibility_status = 'REMOVED', removed_reason = :reason,
            removed_at = CURRENT_TIMESTAMP, reviewed_by = :moderatorId, reviewed_at = CURRENT_TIMESTAMP
        WHERE id = :clipId
        """, nativeQuery = true)
    void removeClipByModeration(@Param("clipId") Long clipId, @Param("moderatorId") Long moderatorId, @Param("reason") String reason);

    @Transactional
    @Modifying
    @Query(value = """
        UPDATE clips
        SET moderation_status = 'APPROVED', visibility_status = 'PUBLIC', moderation_reason = :reason,
            reviewed_by = :moderatorId, reviewed_at = CURRENT_TIMESTAMP, removed_reason = NULL, removed_at = NULL
        WHERE id = :clipId
        """, nativeQuery = true)
    void restoreClip(@Param("clipId") Long clipId, @Param("moderatorId") Long moderatorId, @Param("reason") String reason);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM clip_tags WHERE clip_id = :clipId", nativeQuery = true)
    void clearTagsForClip(@Param("clipId") Long clipId);

    @Query(value = "SELECT id FROM tags WHERE name = :tagName", nativeQuery = true)
    List<Long> findTagIdsByName(@Param("tagName") String tagName);

    @Transactional
    @Modifying
    @Query(value = "INSERT IGNORE INTO tags (name) VALUES (:tagName)", nativeQuery = true)
    void insertTagIfNotExists(@Param("tagName") String tagName);

    @Transactional
    @Modifying
    @Query(value = "INSERT IGNORE INTO clip_tags (clip_id, tag_id) VALUES (:clipId, :tagId)", nativeQuery = true)
    void linkTagToClip(@Param("clipId") Long clipId, @Param("tagId") Long tagId);

    @Transactional
    default void insertTagIfNotExistAndLink(Long clipId, String tagName) {
        insertTagIfNotExists(tagName);
        List<Long> tagIds = findTagIdsByName(tagName);
        if (!tagIds.isEmpty()) {
            linkTagToClip(clipId, tagIds.get(0));
        }
    }

    @Query(value = "SELECT t.name FROM tags t JOIN clip_tags ct ON t.id = ct.tag_id WHERE ct.clip_id = :clipId", nativeQuery = true)
    List<String> getTagsForClip(@Param("clipId") Long clipId);
}
