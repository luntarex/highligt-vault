package hvault.app.repository;

import hvault.app.entity.User;
import hvault.app.repository.projection.SuggestedUserView;
import hvault.app.repository.projection.UserCompactView;
import hvault.app.repository.projection.UserListView;
import hvault.app.repository.projection.UserProfileView;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface UserRepository extends JpaRepository<User, Long> {

    @Query(value = """
        SELECT u.id, u.username, u.email, u.description, u.profile_photo_url AS profilePhotoUrl, u.created_at AS createdAt, u.isAdmin,
               COUNT(DISTINCT p.id) AS postCount,
               COUNT(DISTINCT CASE WHEN c.is_deleted = false OR c.is_deleted IS NULL THEN c.id END) AS totalClips,
               COUNT(DISTINCT CASE WHEN (c.is_deleted = false OR c.is_deleted IS NULL) AND c.visibility_status = 'PUBLIC' THEN c.id END) AS publicClipCount,
               COUNT(DISTINCT uf.clip_id) AS totalFavorites
        FROM users u
        LEFT JOIN posts p ON u.id = p.user_id
        LEFT JOIN clips c ON u.id = c.uploader_id
        LEFT JOIN user_favorites uf ON u.id = uf.user_id
        WHERE u.isDeleted = FALSE OR u.isDeleted IS NULL
        GROUP BY u.id, u.username, u.email, u.description, u.profile_photo_url, u.created_at, u.isAdmin
        ORDER BY postCount DESC
        """, nativeQuery = true)
    List<UserListView> findAllUsersWithPostCount();

    @Query("""
        SELECT u FROM User u
        WHERE u.username = :username AND (u.isDeleted = false OR u.isDeleted IS NULL)
        """)
    Optional<User> findActiveByUsername(@Param("username") String username);

    @Query("""
        SELECT u FROM User u
        WHERE u.email = :email AND (u.isDeleted = false OR u.isDeleted IS NULL)
        """)
    Optional<User> findActiveByEmail(@Param("email") String email);

    @Query(value = """
        SELECT
            u.id,
            u.username,
            u.email,
            u.description,
            u.profile_photo_url AS profilePhotoUrl,
            u.isAdmin,
            u.created_at AS createdAt,
            (SELECT COUNT(*) FROM follows f WHERE f.followed_id = u.id) AS followers,
            (SELECT COUNT(*) FROM follows f WHERE f.follower_id = u.id) AS `following`,
            (SELECT COUNT(*) FROM clips c WHERE c.uploader_id = u.id AND (c.is_deleted = false OR c.is_deleted IS NULL)) AS totalClips,
            (SELECT COUNT(*) FROM user_favorites uf WHERE uf.user_id = u.id) AS totalFavorites
        FROM users u WHERE u.id = :id AND (u.isDeleted = FALSE OR u.isDeleted IS NULL)
        """, nativeQuery = true)
    List<UserProfileView> findProfileRowsById(@Param("id") Long id);

    default UserProfileView findProfileById(Long id) {
        List<UserProfileView> rows = findProfileRowsById(id);
        return rows.isEmpty() ? null : rows.get(0);
    }

    @Transactional
    @Modifying
    @Query(value = "INSERT IGNORE INTO follows (follower_id, followed_id) VALUES (:followerId, :followedId)", nativeQuery = true)
    void followUser(@Param("followerId") Long followerId, @Param("followedId") Long followedId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM follows WHERE follower_id = :followerId AND followed_id = :followedId", nativeQuery = true)
    void unfollowUser(@Param("followerId") Long followerId, @Param("followedId") Long followedId);

    @Query(value = "SELECT COUNT(*) FROM follows WHERE follower_id = :followerId AND followed_id = :followedId", nativeQuery = true)
    int countFollowing(@Param("followerId") Long followerId, @Param("followedId") Long followedId);

    default boolean isFollowing(Long followerId, Long followedId) {
        return countFollowing(followerId, followedId) > 0;
    }

    @Transactional
    @Modifying
    @Query(value = "UPDATE users SET username = :username, description = :description, profile_photo_url = :profilePhotoUrl WHERE id = :id", nativeQuery = true)
    int updateProfile(@Param("id") Long id, @Param("username") String username, @Param("description") String description, @Param("profilePhotoUrl") String profilePhotoUrl);

    @Transactional
    @Modifying
    @Query(value = "UPDATE users SET isDeleted = TRUE WHERE id = :id", nativeQuery = true)
    int softDeleteUser(@Param("id") Long id);

    @Query(value = """
        SELECT u.id, u.username, u.profile_photo_url AS profilePhotoUrl
        FROM users u
        JOIN follows f ON u.id = f.follower_id
        WHERE f.followed_id = :userId AND (u.isDeleted = FALSE OR u.isDeleted IS NULL)
        """, nativeQuery = true)
    List<UserCompactView> findFollowers(@Param("userId") Long userId);

    @Query(value = """
        SELECT u.id, u.username, u.profile_photo_url AS profilePhotoUrl
        FROM users u
        JOIN follows f ON u.id = f.followed_id
        WHERE f.follower_id = :userId AND (u.isDeleted = FALSE OR u.isDeleted IS NULL)
        """, nativeQuery = true)
    List<UserCompactView> findFollowing(@Param("userId") Long userId);

    @Query(value = """
        SELECT u.id, u.username, u.profile_photo_url AS profilePhotoUrl,
               u.description,
               COUNT(DISTINCT f2.follower_id) AS mutualCount,
               (SELECT COUNT(*) FROM follows WHERE followed_id = u.id) AS followers
        FROM follows f1
        JOIN follows f2 ON f2.follower_id = f1.followed_id AND f2.followed_id != :userId
        JOIN users u ON u.id = f2.followed_id
        WHERE f1.follower_id = :userId
          AND f2.followed_id NOT IN (SELECT followed_id FROM follows WHERE follower_id = :userId)
          AND (u.isDeleted = FALSE OR u.isDeleted IS NULL)
        GROUP BY u.id, u.username, u.profile_photo_url, u.description
        ORDER BY mutualCount DESC, followers DESC
        LIMIT 6
        """, nativeQuery = true)
    List<SuggestedUserView> findSuggestedUsersFromFriends(@Param("userId") Long userId);

    @Query(value = """
        SELECT u.id, u.username, u.profile_photo_url AS profilePhotoUrl,
               u.description,
               0 AS mutualCount,
               (SELECT COUNT(*) FROM follows WHERE followed_id = u.id) AS followers
        FROM users u
        WHERE u.id != :userId
          AND u.id NOT IN (SELECT followed_id FROM follows WHERE follower_id = :userId)
          AND (u.isDeleted = FALSE OR u.isDeleted IS NULL)
        ORDER BY followers DESC
        LIMIT 6
        """, nativeQuery = true)
    List<SuggestedUserView> findPopularSuggestedUsers(@Param("userId") Long userId);

    default List<SuggestedUserView> findSuggestedUsers(Long userId) {
        List<SuggestedUserView> rows = findSuggestedUsersFromFriends(userId);
        return rows.isEmpty() ? findPopularSuggestedUsers(userId) : rows;
    }
}
