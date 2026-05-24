package hvault.app.repository;

import hvault.app.entity.Message;
import java.util.List;
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
        WHERE ((sender_id = :userId1 AND receiver_id = :userId2)
           OR (sender_id = :userId2 AND receiver_id = :userId1))
          AND COALESCE(deleted_for_everyone, FALSE) = FALSE
          AND NOT (sender_id = :userId1 AND COALESCE(deleted_for_sender, FALSE) = TRUE)
          AND NOT (receiver_id = :userId1 AND COALESCE(deleted_for_receiver, FALSE) = TRUE)
        ORDER BY created_at ASC, id ASC
        """, nativeQuery = true)
    List<Message> getConversation(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    @Query("""
        SELECT m FROM Message m
        WHERE (m.deletedForEveryone IS NULL OR m.deletedForEveryone = false)
          AND (
            (m.senderId = :userId AND (m.deletedForSender IS NULL OR m.deletedForSender = false))
            OR (m.receiverId = :userId AND (m.deletedForReceiver IS NULL OR m.deletedForReceiver = false))
          )
        ORDER BY m.createdAt DESC, m.id DESC
        """)
    List<Message> findMessagesForUser(@Param("userId") Long userId);

    @Transactional
    @Modifying
    @Query(value = "UPDATE messages SET is_read = TRUE WHERE id = :messageId AND receiver_id = :receiverId", nativeQuery = true)
    int markAsReadForReceiver(@Param("messageId") Long messageId, @Param("receiverId") Long receiverId);

    @Transactional
    @Modifying
    @Query(value = """
        UPDATE messages
        SET deleted_for_sender = CASE WHEN sender_id = :userId1 THEN TRUE ELSE deleted_for_sender END,
            deleted_for_receiver = CASE WHEN receiver_id = :userId1 THEN TRUE ELSE deleted_for_receiver END,
            deleted_at = CURRENT_TIMESTAMP
        WHERE ((sender_id = :userId1 AND receiver_id = :userId2)
           OR (sender_id = :userId2 AND receiver_id = :userId1))
          AND COALESCE(deleted_for_everyone, FALSE) = FALSE
        """, nativeQuery = true)
    void deleteConversationForUser(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    @Transactional
    @Modifying
    @Query(value = """
        UPDATE messages
        SET deleted_for_sender = CASE WHEN sender_id = :userId THEN TRUE ELSE deleted_for_sender END,
            deleted_for_receiver = CASE WHEN receiver_id = :userId THEN TRUE ELSE deleted_for_receiver END,
            deleted_at = CURRENT_TIMESTAMP
        WHERE id IN :ids
          AND (sender_id = :userId OR receiver_id = :userId)
          AND COALESCE(deleted_for_everyone, FALSE) = FALSE
        """, nativeQuery = true)
    void deleteByIdsForUser(@Param("ids") List<Long> ids, @Param("userId") Long userId);

    @Transactional
    @Modifying
    @Query(value = """
        UPDATE messages
        SET deleted_for_everyone = TRUE,
            deleted_at = CURRENT_TIMESTAMP
        WHERE id IN :ids
          AND sender_id = :userId
          AND created_at >= DATE_SUB(CURRENT_TIMESTAMP, INTERVAL 10 MINUTE)
          AND COALESCE(deleted_for_everyone, FALSE) = FALSE
        """, nativeQuery = true)
    void deleteByIdsForEveryone(@Param("ids") List<Long> ids, @Param("userId") Long userId);
}
