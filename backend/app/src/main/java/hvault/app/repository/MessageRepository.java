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
        WHERE (sender_id = :userId1 AND receiver_id = :userId2)
           OR (sender_id = :userId2 AND receiver_id = :userId1)
        ORDER BY created_at ASC, id ASC
        """, nativeQuery = true)
    List<Message> getConversation(@Param("userId1") Long userId1, @Param("userId2") Long userId2);

    @Query("""
        SELECT m FROM Message m
        WHERE m.senderId = :userId OR m.receiverId = :userId
        ORDER BY m.createdAt DESC, m.id DESC
        """)
    List<Message> findMessagesForUser(@Param("userId") Long userId);

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
