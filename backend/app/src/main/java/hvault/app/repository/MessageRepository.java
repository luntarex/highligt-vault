package hvault.app.repository;

import hvault.app.entity.Message;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.jdbc.core.RowMapper;
import org.springframework.stereotype.Repository;

import java.util.List;
import java.util.Map;

@Repository
public class MessageRepository {

    private final JdbcTemplate jdbcTemplate;

    public MessageRepository(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    private final RowMapper<Message> messageRowMapper = (rs, rowNum) -> {
        Message message = new Message();
        message.setId(rs.getLong("id"));
        message.setSenderId(rs.getLong("sender_id"));
        message.setReceiverId(rs.getLong("receiver_id"));
        message.setContent(rs.getString("content"));
        message.setIsRead(rs.getBoolean("is_read"));
        message.setCreatedAt(rs.getTimestamp("created_at").toLocalDateTime());
        return message;
    };

    public void save(Long senderId, Long receiverId, String content) {
        String sql = "INSERT INTO messages (sender_id, receiver_id, content, is_read) VALUES (?, ?, ?, FALSE)";
        jdbcTemplate.update(sql, senderId, receiverId, content);
    }

    public List<Message> getConversation(Long userId1, Long userId2) {
        String sql = """
            SELECT * FROM messages 
            WHERE (sender_id = ? AND receiver_id = ?) 
            OR (sender_id = ? AND receiver_id = ?) 
            ORDER BY created_at ASC
            """;
        return jdbcTemplate.query(sql, messageRowMapper, userId1, userId2, userId2, userId1);
    }

    /**
     * Get list of users the current user has interacted with, along with the last message.
     */
    public List<Map<String, Object>> getConversations(Long userId) {
        String sql = """
            WITH LastMessages AS (
                SELECT 
                    CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END as other_user_id,
                    content,
                    created_at,
                    is_read,
                    sender_id,
                    ROW_NUMBER() OVER (PARTITION BY CASE WHEN sender_id = ? THEN receiver_id ELSE sender_id END ORDER BY created_at DESC) as rn
                FROM messages
                WHERE sender_id = ? OR receiver_id = ?
            )
            SELECT lm.other_user_id, lm.content, lm.created_at, lm.is_read, lm.sender_id, u.username, u.profile_photo_url
            FROM LastMessages lm
            JOIN users u ON lm.other_user_id = u.id
            WHERE lm.rn = 1
            ORDER BY lm.created_at DESC
            """;
        return jdbcTemplate.queryForList(sql, userId, userId, userId, userId);
    }

    public void markAsRead(Long messageId) {
        String sql = "UPDATE messages SET is_read = TRUE WHERE id = ?";
        jdbcTemplate.update(sql, messageId);
    }
}
