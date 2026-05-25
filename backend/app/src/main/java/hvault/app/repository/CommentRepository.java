package hvault.app.repository;

import hvault.app.entity.Comment;
import hvault.app.repository.projection.CommentView;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface CommentRepository extends JpaRepository<Comment, Long> {

    @Query(value = """
        SELECT c.id, c.content, c.created_at AS createdAt, c.user_id AS userId, c.post_id AS postId,
               c.post_comment_id AS parentCommentId,
               u.username, u.profile_photo_url AS profilePhoto
        FROM comments c
        JOIN users u ON c.user_id = u.id
        WHERE c.post_id = :postId
        ORDER BY c.created_at DESC
        """, nativeQuery = true)
    List<CommentView> findByPostId(@Param("postId") Long postId);

    @Query(value = """
        SELECT c.id, c.content, c.created_at AS createdAt, c.user_id AS userId, c.post_id AS postId,
               c.post_comment_id AS parentCommentId,
               u.username, u.profile_photo_url AS profilePhoto,
               cl.title AS postTitle, cl.thumbnail_url AS postThumbnail,
               cl.video_url AS postVideoUrl, cl.duration AS postDuration,
               cl.start_time AS postStartTime, cl.end_time AS postEndTime,
               g.name AS postGameName,
               pu.username AS postAuthorName, pu.profile_photo_url AS postAuthorPhoto, pu.id AS postAuthorId
        FROM comments c
        JOIN users u ON c.user_id = u.id
        JOIN posts p ON c.post_id = p.id
        JOIN users pu ON p.user_id = pu.id
        JOIN clips cl ON p.clip_id = cl.id
        LEFT JOIN games g ON cl.game_id = g.id
        WHERE c.id = :commentId
        """, nativeQuery = true)
    List<CommentView> findReportCommentRowsById(@Param("commentId") Long commentId);

    default CommentView findReportCommentById(Long commentId) {
        List<CommentView> rows = findReportCommentRowsById(commentId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Query(value = """
        SELECT c.id, c.content, c.created_at AS createdAt, c.user_id AS userId, c.post_id AS postId,
               c.post_comment_id AS parentCommentId,
               u.username, u.profile_photo_url AS profilePhoto,
               cl.title AS postTitle, cl.thumbnail_url AS postThumbnail,
               cl.video_url AS postVideoUrl, cl.duration AS postDuration,
               cl.start_time AS postStartTime, cl.end_time AS postEndTime,
               g.name AS postGameName,
               pu.username AS postAuthorName, pu.profile_photo_url AS postAuthorPhoto, pu.id AS postAuthorId
        FROM comments c
        JOIN users u ON c.user_id = u.id
        JOIN posts p ON c.post_id = p.id
        JOIN users pu ON p.user_id = pu.id
        JOIN clips cl ON p.clip_id = cl.id
        LEFT JOIN games g ON cl.game_id = g.id
        WHERE c.user_id = :userId
        ORDER BY c.created_at DESC
        """, nativeQuery = true)
    List<CommentView> findByUserId(@Param("userId") Long userId);

    @Transactional
    @Modifying
    @Query(value = "UPDATE comments SET content = :newContent WHERE id = :id", nativeQuery = true)
    int updateContent(@Param("id") Long id, @Param("newContent") String newContent);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM comments WHERE id = :id", nativeQuery = true)
    int deleteComment(@Param("id") Long id);

    @Transactional
    @Modifying
    @Query(value = """
        INSERT INTO violated_comments (original_comment_id, user_id, post_id, content, original_created_at)
        SELECT id, user_id, post_id, content, created_at
        FROM comments
        WHERE id = :id
        """, nativeQuery = true)
    void archiveViolation(@Param("id") Long id);

    @Transactional
    default int deleteForViolation(Long id) {
        archiveViolation(id);
        return deleteComment(id);
    }

    @Query(value = """
        SELECT COUNT(*)
        FROM comments cm
        JOIN posts p ON cm.post_id = p.id
        JOIN clips c ON p.clip_id = c.id
        WHERE cm.id = :commentId
          AND (c.is_deleted = false OR c.is_deleted IS NULL)
          AND c.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
          AND c.visibility_status = 'PUBLIC'
        """, nativeQuery = true)
    int countPubliclyVisibleComment(@Param("commentId") Long commentId);

    default boolean isPubliclyVisibleComment(Long commentId) {
        return countPubliclyVisibleComment(commentId) > 0;
    }
}
