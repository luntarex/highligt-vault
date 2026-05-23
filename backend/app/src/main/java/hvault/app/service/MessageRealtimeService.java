package hvault.app.service;

import com.fasterxml.jackson.databind.ObjectMapper;
import hvault.app.dto.MessageConversationResponse;
import hvault.app.dto.MessageRealtimePayload;
import hvault.app.dto.MessageResponse;
import org.springframework.stereotype.Service;
import org.springframework.web.socket.TextMessage;
import org.springframework.web.socket.WebSocketSession;

import java.io.IOException;
import java.util.Set;
import java.util.concurrent.ConcurrentHashMap;
import java.util.concurrent.CopyOnWriteArraySet;

@Service
public class MessageRealtimeService {
    private final ObjectMapper objectMapper;
    private final ConcurrentHashMap<Long, Set<WebSocketSession>> sessionsByUser = new ConcurrentHashMap<>();

    public MessageRealtimeService(ObjectMapper objectMapper) {
        this.objectMapper = objectMapper;
    }

    public void register(Long userId, WebSocketSession session) {
        sessionsByUser.computeIfAbsent(userId, ignored -> new CopyOnWriteArraySet<>()).add(session);
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
    }

    public void sendMessageEvent(Long userId, MessageResponse message, MessageConversationResponse conversation) {
        send(userId, new MessageRealtimePayload("message", message, conversation));
    }

    private void send(Long userId, MessageRealtimePayload payload) {
        Set<WebSocketSession> sessions = sessionsByUser.get(userId);
        if (sessions == null || sessions.isEmpty()) {
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
            // Realtime delivery is best-effort; the REST request should not fail after the message is saved.
        }
    }
}
