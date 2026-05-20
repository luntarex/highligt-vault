package hvault.app.repository;

import hvault.app.entity.Post;
import java.util.List;
import java.util.Map;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface PostRepository extends JpaRepository<Post, Long> {

    @Transactional
    @Modifying
    @Query(value = "UPDATE posts SET caption = :newCaption WHERE id = :id", nativeQuery = true)
    int updateCaption(@Param("id") Long id, @Param("newCaption") String newCaption);

    @Query(value = """
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
          AND c.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
          AND c.visibility_status = 'PUBLIC'
        GROUP BY p.id, p.caption, p.created_at, p.clip_id, c.title, c.video_url, c.duration,
                 c.start_time, c.end_time, g.name, u.id, u.username, u.profile_photo_url
        ORDER BY p.created_at DESC
        """, nativeQuery = true)
    List<Map<String, Object>> findAllPostsWithDetails();

    @Transactional
    @Modifying
    @Query(value = "INSERT IGNORE INTO post_likes (post_id, user_id, created_at) VALUES (:postId, :userId, CURRENT_TIMESTAMP)", nativeQuery = true)
    void likePost(@Param("postId") Long postId, @Param("userId") Long userId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM post_likes WHERE post_id = :postId AND user_id = :userId", nativeQuery = true)
    void unlikePost(@Param("postId") Long postId, @Param("userId") Long userId);

    @Query(value = "SELECT COUNT(*) FROM post_likes WHERE post_id = :postId AND user_id = :userId", nativeQuery = true)
    int countLikedByUser(@Param("postId") Long postId, @Param("userId") Long userId);

    default boolean isLikedByUser(Long postId, Long userId) {
        return countLikedByUser(postId, userId) > 0;
    }

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
    void deletePostRowsByClipId(@Param("clipId") Long clipId);

    @Transactional
    default void deleteByClipId(Long clipId) {
        for (Long postId : findPostIdsByClipId(clipId)) {
            deleteCommentsByPostId(postId);
            deletePostLikesByPostId(postId);
        }
        deletePostRowsByClipId(clipId);
    }

    @Query(value = "SELECT clip_id FROM posts WHERE id = :postId", nativeQuery = true)
    List<Long> findClipIdsByPostId(@Param("postId") Long postId);

    default Long getClipIdByPostId(Long postId) {
        List<Long> rows = findClipIdsByPostId(postId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM posts WHERE id = :postId", nativeQuery = true)
    void deletePostRow(@Param("postId") Long postId);

    @Transactional
    default void deletePost(Long postId) {
        deleteCommentsByPostId(postId);
        deletePostLikesByPostId(postId);
        deletePostRow(postId);
    }

    @Query(value = "SELECT COUNT(*) FROM posts WHERE clip_id = :clipId", nativeQuery = true)
    int countByClipId(@Param("clipId") Long clipId);

    default boolean existsByClipId(Long clipId) {
        return countByClipId(clipId) > 0;
    }

    @Query(value = """
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
          AND c.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
          AND c.visibility_status = 'PUBLIC'
          AND (p.user_id = :userId OR p.user_id IN (SELECT followed_id FROM follows WHERE follower_id = :userId))
        GROUP BY p.id, p.caption, p.created_at, p.clip_id, c.title, c.video_url, c.duration,
                 c.start_time, c.end_time, g.name, u.id, u.username, u.profile_photo_url
        ORDER BY p.created_at DESC
        """, nativeQuery = true)
    List<Map<String, Object>> findFollowingFeedPosts(@Param("userId") Long userId);

    @Query(value = """
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
        WHERE p.clip_id = :clipId
          AND (c.is_deleted = false OR c.is_deleted IS NULL)
          AND c.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
          AND c.visibility_status = 'PUBLIC'
        GROUP BY p.id, p.caption, p.created_at, p.clip_id, c.title, c.video_url, c.duration,
                 c.start_time, c.end_time, g.name, u.id, u.username, u.profile_photo_url
        """, nativeQuery = true)
    List<Map<String, Object>> findRowsByClipIdWithDetails(@Param("clipId") Long clipId);

    default Map<String, Object> findByClipIdWithDetails(Long clipId) {
        List<Map<String, Object>> rows = findRowsByClipIdWithDetails(clipId);
        return rows.isEmpty() ? null : rows.get(0);
    }
}
