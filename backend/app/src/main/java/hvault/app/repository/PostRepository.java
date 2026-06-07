package hvault.app.repository;

import hvault.app.entity.Post;
import hvault.app.repository.projection.PostDetailsView;
import hvault.app.repository.projection.UserPostView;
import java.util.List;
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
        SELECT p.id, p.caption, p.created_at AS createdAt, p.clip_id AS clipId,
               c.title AS clipTitle, c.video_url AS videoUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime,
               g.name AS gameName,
               u.id AS authorId, u.username AS authorName, u.profile_photo_url AS authorPhoto,
               COUNT(DISTINCT pl.user_id) AS likes,
               COUNT(DISTINCT cm.id) AS comments
        FROM posts p
        JOIN clips c ON p.clip_id = c.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN games g ON c.game_id = g.id
        LEFT JOIN post_likes pl ON pl.post_id = p.id
        LEFT JOIN comments cm ON cm.post_id = p.id
        WHERE (c.is_deleted = false OR c.is_deleted IS NULL)
          AND p.community_id IS NULL
          AND c.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
          AND c.visibility_status = 'PUBLIC'
        GROUP BY p.id, p.caption, p.created_at, p.clip_id, c.title, c.video_url, c.duration,
                 c.start_time, c.end_time, g.name, u.id, u.username, u.profile_photo_url
        ORDER BY p.created_at DESC
        """, nativeQuery = true)
    List<PostDetailsView> findAllPostsWithDetails();

    @Query(value = """
        SELECT p.id AS postId, p.clip_id AS clipId, p.caption AS caption,
               c.title AS clipTitle, c.thumbnail_url AS thumbnailUrl,
               c.duration AS duration, p.created_at AS createdAt,
               g.name AS gameName
        FROM posts p
        JOIN clips c ON p.clip_id = c.id
        LEFT JOIN games g ON c.game_id = g.id
        WHERE p.user_id = :userId
          AND p.community_id IS NULL
          AND (c.is_deleted = false OR c.is_deleted IS NULL)
          AND c.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
          AND c.visibility_status = 'PUBLIC'
        ORDER BY p.created_at DESC
        """, nativeQuery = true)
    List<UserPostView> findUserPostsWithDetails(@Param("userId") Long userId);

    @Query(value = """
        SELECT p.id, p.caption, p.created_at AS createdAt, p.clip_id AS clipId, p.community_id AS communityId, cg.name AS communityName, p.original_post_id AS originalPostId, p.repost_type AS repostType,
               c.title AS clipTitle, c.video_url AS videoUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime,
               COALESCE(g.name, cg.name) AS gameName,
               u.id AS authorId, u.username AS authorName, u.profile_photo_url AS authorPhoto,
               COUNT(DISTINCT pl.user_id) AS likes,
               COUNT(DISTINCT cm.id) AS comments
        FROM posts p
        LEFT JOIN clips c ON p.clip_id = c.id
        LEFT JOIN communities cg ON p.community_id = cg.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN games g ON c.game_id = g.id
        LEFT JOIN post_likes pl ON pl.post_id = p.id
        LEFT JOIN comments cm ON cm.post_id = p.id
        WHERE p.id = :postId
          AND (
            p.clip_id IS NULL
            OR (
              (c.is_deleted = false OR c.is_deleted IS NULL)
              AND c.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
              AND c.visibility_status = 'PUBLIC'
            )
          )
        GROUP BY p.id, p.caption, p.created_at, p.clip_id, p.community_id, p.original_post_id, p.repost_type, c.title, c.video_url, c.duration,
                 c.start_time, c.end_time, g.name, cg.name, u.id, u.username, u.profile_photo_url
        """, nativeQuery = true)
    List<PostDetailsView> findRowsByPostIdWithDetails(@Param("postId") Long postId);

    default PostDetailsView findByPostIdWithDetails(Long postId) {
        List<PostDetailsView> rows = findRowsByPostIdWithDetails(postId);
        return rows.isEmpty() ? null : rows.get(0);
    }

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

    default Long getPostIdByClipId(Long clipId) {
        List<Long> rows = findPostIdsByClipId(clipId);
        return rows.isEmpty() ? null : rows.get(0);
    }

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
    @Query(value = """
        UPDATE messages
        SET shared_post_unavailable = TRUE,
            shared_post_id = NULL
        WHERE shared_post_id = :postId
        """, nativeQuery = true)
    void markSharedPostUnavailableByPostId(@Param("postId") Long postId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM posts WHERE clip_id = :clipId", nativeQuery = true)
    void deletePostRowsByClipId(@Param("clipId") Long clipId);

    @Transactional
    default void deleteByClipId(Long clipId) {
        for (Long postId : findPostIdsByClipId(clipId)) {
            markSharedPostUnavailableByPostId(postId);
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

    @Query(value = """
        SELECT COALESCE(p.community_id, cg.id)
        FROM posts p
        LEFT JOIN clips c ON c.id = p.clip_id
        LEFT JOIN communities cg ON cg.game_id = c.game_id AND cg.type = 'GAME'
        WHERE p.id = :postId
        """, nativeQuery = true)
    List<Long> findCommunityIdsByPostId(@Param("postId") Long postId);

    default Long getCommunityIdByPostId(Long postId) {
        List<Long> rows = findCommunityIdsByPostId(postId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM posts WHERE id = :postId", nativeQuery = true)
    void deletePostRow(@Param("postId") Long postId);

    @Transactional
    default void deletePost(Long postId) {
        markSharedPostUnavailableByPostId(postId);
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
        SELECT p.id, p.caption, p.created_at AS createdAt, p.clip_id AS clipId,
               c.title AS clipTitle, c.video_url AS videoUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime,
               g.name AS gameName,
               u.id AS authorId, u.username AS authorName, u.profile_photo_url AS authorPhoto,
               COUNT(DISTINCT pl.user_id) AS likes,
               COUNT(DISTINCT cm.id) AS comments
        FROM posts p
        JOIN clips c ON p.clip_id = c.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN games g ON c.game_id = g.id
        LEFT JOIN post_likes pl ON pl.post_id = p.id
        LEFT JOIN comments cm ON cm.post_id = p.id
        WHERE (c.is_deleted = false OR c.is_deleted IS NULL)
          AND p.community_id IS NULL
          AND c.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
          AND c.visibility_status = 'PUBLIC'
          AND (p.user_id = :userId OR p.user_id IN (SELECT followed_id FROM follows WHERE follower_id = :userId))
        GROUP BY p.id, p.caption, p.created_at, p.clip_id, c.title, c.video_url, c.duration,
                 c.start_time, c.end_time, g.name, u.id, u.username, u.profile_photo_url
        ORDER BY p.created_at DESC
        """, nativeQuery = true)
    List<PostDetailsView> findFollowingFeedPosts(@Param("userId") Long userId);

    @Query(value = """
        SELECT p.id, p.caption, p.created_at AS createdAt, p.clip_id AS clipId, p.community_id AS communityId, cg.name AS communityName, p.original_post_id AS originalPostId, p.repost_type AS repostType,
               c.title AS clipTitle, c.video_url AS videoUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime,
               g.name AS gameName,
               u.id AS authorId, u.username AS authorName, u.profile_photo_url AS authorPhoto,
               COUNT(DISTINCT pl.user_id) AS likes,
               COUNT(DISTINCT cm.id) AS comments
        FROM posts p
        JOIN clips c ON p.clip_id = c.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN games g ON c.game_id = g.id
        LEFT JOIN communities cg ON p.community_id = cg.id
        LEFT JOIN post_likes pl ON pl.post_id = p.id
        LEFT JOIN comments cm ON cm.post_id = p.id
        WHERE c.game_id = :gameId
          AND p.community_id IS NULL
          AND (p.clip_id IS NULL OR (c.is_deleted = false OR c.is_deleted IS NULL)
          AND c.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
          AND c.visibility_status = 'PUBLIC')
        GROUP BY p.id, p.caption, p.created_at, p.clip_id, p.community_id, cg.name, p.original_post_id, p.repost_type, c.title, c.video_url, c.duration,
                 c.start_time, c.end_time, g.name, u.id, u.username, u.profile_photo_url
        ORDER BY p.created_at DESC
        """, nativeQuery = true)
    List<PostDetailsView> findPostsByGameId(@Param("gameId") Long gameId);

    @Query(value = """
        SELECT p.id, p.caption, p.created_at AS createdAt, p.clip_id AS clipId, p.community_id AS communityId, cg.name AS communityName, p.original_post_id AS originalPostId, p.repost_type AS repostType,
               c.title AS clipTitle, c.video_url AS videoUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime,
               COALESCE(g.name, cg.name) AS gameName,
               u.id AS authorId, u.username AS authorName, u.profile_photo_url AS authorPhoto,
               COUNT(DISTINCT pl.user_id) AS likes,
               COUNT(DISTINCT cm.id) AS comments
        FROM posts p
        LEFT JOIN clips c ON p.clip_id = c.id
        LEFT JOIN games g ON c.game_id = g.id
        LEFT JOIN communities cg ON p.community_id = cg.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN post_likes pl ON pl.post_id = p.id
        LEFT JOIN comments cm ON cm.post_id = p.id
        WHERE (
            p.community_id = :communityId
            OR (:gameId IS NOT NULL AND c.game_id = :gameId)
          )
          AND (
            p.clip_id IS NULL
            OR (
              (c.is_deleted = false OR c.is_deleted IS NULL)
              AND c.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
              AND c.visibility_status = 'PUBLIC'
            )
          )
        GROUP BY p.id, p.caption, p.created_at, p.clip_id, p.community_id, p.original_post_id, p.repost_type, c.title, c.video_url, c.duration,
                 c.start_time, c.end_time, g.name, cg.name, u.id, u.username, u.profile_photo_url
        ORDER BY p.created_at DESC
        """, nativeQuery = true)
    List<PostDetailsView> findCommunityPosts(@Param("communityId") Long communityId, @Param("gameId") Long gameId);

    @Query(value = """
        SELECT p.id, p.caption, p.created_at AS createdAt, p.clip_id AS clipId, p.community_id AS communityId, cg.name AS communityName, p.original_post_id AS originalPostId, p.repost_type AS repostType,
               c.title AS clipTitle, c.video_url AS videoUrl, c.duration,
               c.start_time AS startTime, c.end_time AS endTime,
               g.name AS gameName,
               u.id AS authorId, u.username AS authorName, u.profile_photo_url AS authorPhoto,
               COUNT(DISTINCT pl.user_id) AS likes,
               COUNT(DISTINCT cm.id) AS comments
        FROM posts p
        JOIN clips c ON p.clip_id = c.id
        JOIN users u ON p.user_id = u.id
        LEFT JOIN games g ON c.game_id = g.id
        LEFT JOIN communities cg ON p.community_id = cg.id
        LEFT JOIN post_likes pl ON pl.post_id = p.id
        LEFT JOIN comments cm ON cm.post_id = p.id
        WHERE p.clip_id = :clipId
          AND (c.is_deleted = false OR c.is_deleted IS NULL)
          AND c.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
          AND c.visibility_status = 'PUBLIC'
        GROUP BY p.id, p.caption, p.created_at, p.clip_id, p.community_id, cg.name, p.original_post_id, p.repost_type, c.title, c.video_url, c.duration,
                 c.start_time, c.end_time, g.name, u.id, u.username, u.profile_photo_url
        """, nativeQuery = true)
    List<PostDetailsView> findRowsByClipIdWithDetails(@Param("clipId") Long clipId);

    default PostDetailsView findByClipIdWithDetails(Long clipId) {
        List<PostDetailsView> rows = findRowsByClipIdWithDetails(clipId);
        return rows.isEmpty() ? null : rows.get(0);
    }
}
