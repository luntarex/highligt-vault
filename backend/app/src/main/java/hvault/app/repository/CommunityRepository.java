package hvault.app.repository;

import hvault.app.entity.Community;
import hvault.app.repository.projection.CommunityView;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface CommunityRepository extends JpaRepository<Community, Long> {

    @Query(value = "SELECT game_id FROM communities WHERE game_id IS NOT NULL", nativeQuery = true)
    List<Long> findCommunityGameIds();

    @Query(value = """
        SELECT c.id, c.name, c.description,
               CASE WHEN c.type = 'GAME' THEN COALESCE(c.thumbnail_url, g.cover_url) ELSE c.thumbnail_url END AS thumbnailUrl,
               c.type,
               c.game_id AS gameId, c.founder_id AS founderId, u.username AS founderUsername,
               c.moderation_status AS moderationStatus, c.moderation_reason AS moderationReason,
               c.rules AS rules,
               COUNT(cm.user_id) AS memberCount,
               (
                   SELECT COUNT(*)
                   FROM posts p
                   LEFT JOIN clips pc ON pc.id = p.clip_id
                   WHERE (
                       p.community_id = c.id
                       OR (c.type = 'GAME' AND pc.game_id = c.game_id)
                     )
                     AND (
                       p.clip_id IS NULL
                       OR (
                         (pc.is_deleted = false OR pc.is_deleted IS NULL)
                         AND pc.visibility_status = 'PUBLIC'
                         AND pc.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
                       )
                     )
               ) AS postCount,
               viewer.role AS viewerRole,
               c.created_at AS createdAt
        FROM communities c
        LEFT JOIN games g ON c.game_id = g.id
        LEFT JOIN users u ON c.founder_id = u.id
        LEFT JOIN community_members cm ON cm.community_id = c.id
        LEFT JOIN community_members viewer ON viewer.community_id = c.id AND viewer.user_id = :viewerId
        WHERE (
            c.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
            OR (
                :includePending = true
                AND c.moderation_status IN ('PENDING_REVIEW', 'NEEDS_MANUAL_REVIEW')
            )
        )
        AND NOT (c.type = 'GAME' AND LOWER(COALESCE(g.name, c.name)) = 'other')
        GROUP BY c.id, c.name, c.description, c.thumbnail_url, g.cover_url, c.type, c.game_id, c.founder_id,
                 u.username, c.moderation_status, c.moderation_reason, c.rules, viewer.role, c.created_at
        ORDER BY c.created_at DESC
        """, nativeQuery = true)
    List<CommunityView> findCommunityViews(@Param("viewerId") Long viewerId, @Param("includePending") boolean includePending);

    @Query(value = """
        SELECT c.id, c.name, c.description,
               CASE WHEN c.type = 'GAME' THEN COALESCE(c.thumbnail_url, g.cover_url) ELSE c.thumbnail_url END AS thumbnailUrl,
               c.type,
               c.game_id AS gameId, c.founder_id AS founderId, u.username AS founderUsername,
               c.moderation_status AS moderationStatus, c.moderation_reason AS moderationReason,
               c.rules AS rules,
               COUNT(cm.user_id) AS memberCount,
               (
                   SELECT COUNT(*)
                   FROM posts p
                   LEFT JOIN clips pc ON pc.id = p.clip_id
                   WHERE (
                       p.community_id = c.id
                       OR (c.type = 'GAME' AND pc.game_id = c.game_id)
                     )
                     AND (
                       p.clip_id IS NULL
                       OR (
                         (pc.is_deleted = false OR pc.is_deleted IS NULL)
                         AND pc.visibility_status = 'PUBLIC'
                         AND pc.moderation_status IN ('APPROVED', 'AUTO_APPROVED')
                       )
                     )
               ) AS postCount,
               viewer.role AS viewerRole,
               c.created_at AS createdAt
        FROM communities c
        LEFT JOIN games g ON c.game_id = g.id
        LEFT JOIN users u ON c.founder_id = u.id
        LEFT JOIN community_members cm ON cm.community_id = c.id
        LEFT JOIN community_members viewer ON viewer.community_id = c.id AND viewer.user_id = :viewerId
        WHERE c.id = :communityId
          AND NOT (c.type = 'GAME' AND LOWER(COALESCE(g.name, c.name)) = 'other')
        GROUP BY c.id, c.name, c.description, c.thumbnail_url, g.cover_url, c.type, c.game_id, c.founder_id,
                 u.username, c.moderation_status, c.moderation_reason, c.rules, viewer.role, c.created_at
        """, nativeQuery = true)
    List<CommunityView> findCommunityViewRowsById(@Param("communityId") Long communityId, @Param("viewerId") Long viewerId);

    default CommunityView findCommunityViewById(Long communityId, Long viewerId) {
        List<CommunityView> rows = findCommunityViewRowsById(communityId, viewerId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Transactional
    @Modifying
    @Query(value = "INSERT IGNORE INTO community_members (community_id, user_id, role, joined_at) VALUES (:communityId, :userId, :role, CURRENT_TIMESTAMP)", nativeQuery = true)
    void addMember(@Param("communityId") Long communityId, @Param("userId") Long userId, @Param("role") String role);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM community_members WHERE community_id = :communityId AND user_id = :userId", nativeQuery = true)
    void removeMember(@Param("communityId") Long communityId, @Param("userId") Long userId);

    @Transactional
    @Modifying
    @Query(value = "UPDATE community_members SET role = :role WHERE community_id = :communityId AND user_id = :userId", nativeQuery = true)
    int updateMemberRole(@Param("communityId") Long communityId, @Param("userId") Long userId, @Param("role") String role);

    @Query(value = "SELECT role FROM community_members WHERE community_id = :communityId AND user_id = :userId", nativeQuery = true)
    List<String> findMemberRoles(@Param("communityId") Long communityId, @Param("userId") Long userId);

    default String findMemberRole(Long communityId, Long userId) {
        List<String> rows = findMemberRoles(communityId, userId);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Transactional
    @Modifying
    @Query(value = "UPDATE communities SET thumbnail_url = :thumbnailUrl WHERE id = :communityId", nativeQuery = true)
    void updateThumbnail(@Param("communityId") Long communityId, @Param("thumbnailUrl") String thumbnailUrl);

    @Transactional
    @Modifying
    @Query(value = """
        UPDATE communities
        SET name = :name,
            description = :description,
            thumbnail_url = :thumbnailUrl,
            rules = :rules
        WHERE id = :communityId
        """, nativeQuery = true)
    void updateCommunity(
        @Param("communityId") Long communityId,
        @Param("name") String name,
        @Param("description") String description,
        @Param("thumbnailUrl") String thumbnailUrl,
        @Param("rules") String rules
    );

    @Transactional
    @Modifying
    @Query(value = "UPDATE communities SET moderation_status = :status, moderation_reason = :reason WHERE id = :communityId", nativeQuery = true)
    void updateModerationStatus(@Param("communityId") Long communityId, @Param("status") String status, @Param("reason") String reason);
}
