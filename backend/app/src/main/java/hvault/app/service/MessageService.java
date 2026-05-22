package hvault.app.service;

import hvault.app.dto.MessageConversationResponse;
import hvault.app.entity.Message;
import hvault.app.entity.User;
import hvault.app.repository.MessageRepository;
import hvault.app.repository.UserRepository;
import hvault.app.repository.projection.MessageConversationView;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;

    public MessageService(MessageRepository messageRepository, UserRepository userRepository) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
    }

    public void sendMessage(Long senderId, Long receiverId, String content) {
        Message message = new Message();
        message.setSenderId(senderId);
        message.setReceiverId(receiverId);
        message.setContent(content);
        message.setIsRead(false);
        message.setCreatedAt(LocalDateTime.now());
        messageRepository.save(message);
    }

    public List<Message> getConversation(Long userId1, Long userId2) {
        return messageRepository.getConversation(userId1, userId2);
    }

    public List<MessageConversationResponse> getConversations(Long userId) {
        Map<Long, Message> latestByOtherUser = new LinkedHashMap<>();
        for (Message message : messageRepository.findMessagesForUser(userId)) {
            Long otherUserId = userId.equals(message.getSenderId())
                ? message.getReceiverId()
                : message.getSenderId();
            latestByOtherUser.putIfAbsent(otherUserId, message);
        }

        List<MessageConversationResponse> conversations = new ArrayList<>();
        for (Map.Entry<Long, Message> entry : latestByOtherUser.entrySet()) {
            conversations.add(toConversationResponse(userId, entry.getKey(), entry.getValue()));
        }
        return conversations;
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
        if (ids != null && !ids.isEmpty()) {
            messageRepository.deleteByIds(ids);
        }
    }

    private MessageConversationResponse toConversationResponse(MessageConversationView conversation) {
        MessageConversationResponse response = new MessageConversationResponse();
        response.setOtherUserId(conversation.getOtherUserId());
        response.setContent(conversation.getContent());
        response.setCreatedAt(conversation.getCreatedAt());
        response.setIsRead(Boolean.TRUE.equals(conversation.getIsRead()));
        response.setSenderId(conversation.getSenderId());
        response.setUsername(conversation.getUsername());
        response.setProfilePhotoUrl(conversation.getProfilePhotoUrl());
        return response;
    }

    private MessageConversationResponse toConversationResponse(Long currentUserId, Long otherUserId, Message latestMessage) {
        User otherUser = userRepository.findById(otherUserId).orElse(null);
        MessageConversationResponse response = new MessageConversationResponse();
        response.setOtherUserId(otherUserId);
        response.setContent(latestMessage.getContent());
        response.setCreatedAt(latestMessage.getCreatedAt());
        response.setIsRead(Boolean.TRUE.equals(latestMessage.getIsRead()));
        response.setSenderId(latestMessage.getSenderId());
        response.setUsername(otherUser != null ? otherUser.getUsername() : "Unknown user");
        response.setProfilePhotoUrl(otherUser != null ? otherUser.getProfilePhotoUrl() : null);
        return response;
    }
}
