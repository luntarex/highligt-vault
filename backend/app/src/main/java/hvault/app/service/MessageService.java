package hvault.app.service;

import hvault.app.entity.Message;
import hvault.app.repository.MessageRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class MessageService {

    private final MessageRepository messageRepository;

    public MessageService(MessageRepository messageRepository) {
        this.messageRepository = messageRepository;
    }

    public void sendMessage(Long senderId, Long receiverId, String content) {
        messageRepository.save(senderId, receiverId, content);
    }

    public List<Message> getConversation(Long userId1, Long userId2) {
        return messageRepository.getConversation(userId1, userId2);
    }

    public List<Map<String, Object>> getConversations(Long userId) {
        return messageRepository.getConversations(userId);
    }

    public void markAsRead(Long messageId) {
        messageRepository.markAsRead(messageId);
    }

    public void deleteConversation(Long userId1, Long userId2) {
        messageRepository.deleteConversation(userId1, userId2);
    }

    public void deleteMessage(Long id) {
        messageRepository.deleteById(id);
    }

    public void deleteMessages(List<Long> ids) {
        messageRepository.deleteByIds(ids);
    }
}
