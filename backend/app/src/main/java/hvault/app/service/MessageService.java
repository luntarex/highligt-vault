package hvault.app.service;

import hvault.app.dto.MessageConversationResponse;
import hvault.app.dto.MessageResponse;
import hvault.app.dto.PostFeedResponse;
import hvault.app.entity.Message;
import hvault.app.entity.User;
import hvault.app.repository.MessageRepository;
import hvault.app.repository.UserRepository;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.stereotype.Service;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.NoSuchElementException;

@Service
public class MessageService {

    private final MessageRepository messageRepository;
    private final UserRepository userRepository;
    private final PostService postService;

    public MessageService(MessageRepository messageRepository, UserRepository userRepository, PostService postService) {
        this.messageRepository = messageRepository;
        this.userRepository = userRepository;
        this.postService = postService;
    }

    public void sendMessage(Long senderId, Long receiverId, String content, Long sharedPostId) {
        String cleanContent = content == null ? "" : content.trim();
        if (cleanContent.isBlank() && sharedPostId == null) {
            throw new IllegalArgumentException("Message content or shared post is required.");
        }
        if (senderId.equals(receiverId)) {
            throw new IllegalArgumentException("You cannot send a message to yourself.");
        }
        if (sharedPostId != null && postService.getPostById(sharedPostId, senderId) == null) {
            throw new NoSuchElementException("Shared post not found.");
        }

        Message message = new Message();
        message.setSenderId(senderId);
        message.setReceiverId(receiverId);
        message.setContent(cleanContent.isBlank() ? "Shared a post" : cleanContent);
        message.setSharedPostId(sharedPostId);
        message.setIsRead(false);
        message.setCreatedAt(LocalDateTime.now());
        messageRepository.save(message);
    }

    public List<MessageResponse> getConversation(Long userId1, Long userId2) {
        return messageRepository.getConversation(userId1, userId2).stream()
            .map(message -> toMessageResponse(message, userId1))
            .toList();
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

    public void markAsRead(Long messageId, Long currentUserId) {
        Message message = messageRepository.findById(messageId)
            .orElseThrow(() -> new NoSuchElementException("Message not found."));
        if (!currentUserId.equals(message.getReceiverId())) {
            throw new AccessDeniedException("Only the receiver can mark this message as read.");
        }
        messageRepository.markAsReadForReceiver(messageId, currentUserId);
    }

    public void deleteConversation(Long currentUserId, Long otherUserId) {
        messageRepository.deleteConversation(currentUserId, otherUserId);
    }

    public void deleteMessage(Long id, Long currentUserId, boolean admin) {
        Message message = messageRepository.findById(id)
            .orElseThrow(() -> new NoSuchElementException("Message not found."));
        requireMessageParticipantOrAdmin(message, currentUserId, admin);
        messageRepository.deleteById(id);
    }

    public void deleteMessages(List<Long> ids, Long currentUserId, boolean admin) {
        if (ids != null && !ids.isEmpty()) {
            List<Message> messages = messageRepository.findAllById(ids);
            if (messages.size() != ids.size()) {
                throw new NoSuchElementException("One or more messages could not be found.");
            }
            for (Message message : messages) {
                requireMessageParticipantOrAdmin(message, currentUserId, admin);
            }
            messageRepository.deleteByIds(ids);
        }
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
        response.setSharedPostId(latestMessage.getSharedPostId());
        response.setSharedPost(resolveSharedPost(latestMessage.getSharedPostId(), currentUserId));
        return response;
    }

    private MessageResponse toMessageResponse(Message message, Long currentUserId) {
        MessageResponse response = new MessageResponse();
        response.setId(message.getId());
        response.setSenderId(message.getSenderId());
        response.setReceiverId(message.getReceiverId());
        response.setContent(message.getContent());
        response.setIsRead(Boolean.TRUE.equals(message.getIsRead()));
        response.setCreatedAt(message.getCreatedAt());
        response.setSharedPostId(message.getSharedPostId());
        response.setSharedPost(resolveSharedPost(message.getSharedPostId(), currentUserId));
        return response;
    }

    private PostFeedResponse resolveSharedPost(Long sharedPostId, Long currentUserId) {
        return sharedPostId == null ? null : postService.getPostById(sharedPostId, currentUserId);
    }

    private void requireMessageParticipantOrAdmin(Message message, Long currentUserId, boolean admin) {
        if (admin) {
            return;
        }
        if (!currentUserId.equals(message.getSenderId()) && !currentUserId.equals(message.getReceiverId())) {
            throw new AccessDeniedException("You do not have permission to modify this message.");
        }
    }
}
