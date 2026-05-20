package hvault.app.repository;

import hvault.app.entity.Message;
import java.util.List;
import java.util.Map;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Modifying;
import org.springframework.data.jpa.repository.Query;
import org.springframework.data.repository.query.Param;
import org.springframework.stereotype.Repository;
import org.springframework.transaction.annotation.Transactional;

@Repository
public interface MessageRepository extends JpaRepository<Message, Long> {

    @Query(value = """
        SELECT * FROM messages
        WHERE (sender_id = :userId1 AND receiver_id = :userId2)
           OR (sender_id = :userId2 AND receiver_id = :userId1)
        ORDER BY created_at ASC
        """, nativeQuery = true)
    List<Message> getConversation(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    @Query(value = """
        WITH LastMessages AS (
            SELECT
                CASE WHEN sender_id = :userId THEN receiver_id ELSE sender_id END as other_user_id,
                content,
                created_at,
                is_read,
                sender_id,
                ROW_NUMBER() OVER (PARTITION BY CASE WHEN sender_id = :userId THEN receiver_id ELSE sender_id END ORDER BY created_at DESC) as rn
            FROM messages
            WHERE sender_id = :userId OR receiver_id = :userId
        )
        SELECT lm.other_user_id, lm.content, lm.created_at, lm.is_read, lm.sender_id, u.username, u.profile_photo_url
        FROM LastMessages lm
        JOIN users u ON lm.other_user_id = u.id
        WHERE lm.rn = 1
        ORDER BY lm.created_at DESC
        """, nativeQuery = true)
    List<Map<String, Object>> getConversations(@Param("userId") Long userId);

    @Transactional
    @Modifying
    @Query(value = "UPDATE messages SET is_read = TRUE WHERE id = :messageId", nativeQuery = true)
    void markAsRead(@Param("messageId") Long messageId);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM messages WHERE (sender_id = :userId1 AND receiver_id = :userId2) OR (sender_id = :userId2 AND receiver_id = :userId1)", nativeQuery = true)
    void deleteConversation(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    @Transactional
    @Modifying
    @Query(value = "DELETE FROM messages WHERE id IN :ids", nativeQuery = true)
    void deleteByIds(@Param("ids") List<Long> ids);
}
