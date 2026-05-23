package hvault.app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import com.fasterxml.jackson.databind.SerializationFeature;
import com.fasterxml.jackson.datatype.jsr310.JavaTimeModule;
import hvault.app.dto.MessageConversationResponse;
import hvault.app.dto.MessageRealtimePayload;
import hvault.app.dto.MessageResponse;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Service
public class MessageRealtimeService {
    private static final Logger logger = LoggerFactory.getLogger(MessageRealtimeService.class);

    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<Long, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

    public MessageRealtimeService() {
        this.objectMapper = new ObjectMapper()
            .registerModule(new JavaTimeModule())
            .disable(SerializationFeature.WRITE_DATES_AS_TIMESTAMPS);
    }

    public void register(Long userId, WebSocketSession session) {
        sessionsByUser.computeIfAbsent(userId, ignored -> new CopyOnWriteArraySet<>()).add(session);
        logger.info("Realtime message socket connected for user {}", userId);
    }

    public void unregister(Long userId, WebSocketSession session) {
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions == null) {
            return;
        }

        sessions.remove(session);
        if (sessions.isEmpty()) {
            sessionsByUser.remove(userId);
        }
        logger.info("Realtime message socket disconnected for user {}", userId);
    }

    public void sendMessageEvent(Long userId, MessageResponse message, MessageConversationResponse conversation) {
        send(userId, new MessageRealtimePayload("message", message, conversation));
    }

    private void send(Long userId, MessageRealtimePayload payload) {
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions == null || sessions.isEmpty()) {
            logger.debug("No realtime message sockets registered for user {}", userId);
            return;
        }

        try {
            TextMessage textMessage = new TextMessage(objectMapper.writeValueAsString(payload));
            for (WebSocketSession session : sessions) {
                if (session.isOpen()) {
                    session.sendMessage(textMessage);
                }
            }
        } catch (IOException e) {
            logger.warn("Could not send realtime message event to user {}.", userId, e);
        }
    }
}
