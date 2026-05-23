package hvault.app.websocket;

import hvault.app.security.JwtService;
import hvault.app.service.MessageRealtimeService;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.stereotype.Component;
import org.springframework.web.socket.CloseStatus;
import org.springframework.web.socket.WebSocketSession;
import org.springframework.web.socket.handler.TextWebSocketHandler;
import org.springframework.web.util.UriComponentsBuilder;

@Component
public class MessageWebSocketHandler extends TextWebSocketHandler {
    private static final Logger logger = LoggerFactory.getLogger(MessageWebSocketHandler.class);
    private static final String USER_ID_ATTRIBUTE = "userId";

    private final JwtService jwtService;
    private final MessageRealtimeService realtimeService;

    public MessageWebSocketHandler(JwtService jwtService, MessageRealtimeService realtimeService) {
        this.jwtService = jwtService;
        this.realtimeService = realtimeService;
    }

    @Override
    public void afterConnectionEstablished(WebSocketSession session) throws Exception {
        JwtService.JwtClaims claims = validateSession(session);
        if (claims == null) {
            logger.warn("Rejected realtime message socket with missing or invalid token from {}", session.getRemoteAddress());
            session.close(CloseStatus.NOT_ACCEPTABLE.withReason("Invalid token"));
            return;
        }

        session.getAttributes().put(USER_ID_ATTRIBUTE, claims.userId());
        realtimeService.register(claims.userId(), session);
    }

    @Override
    public void afterConnectionClosed(WebSocketSession session, CloseStatus status) {
        Object userId = session.getAttributes().get(USER_ID_ATTRIBUTE);
        if (userId instanceof Long id) {
            realtimeService.unregister(id, session);
        }
    }

    private JwtService.JwtClaims validateSession(WebSocketSession session) {
        if (session.getUri() == null) {
            return null;
        }

        String token = UriComponentsBuilder.fromUri(session.getUri())
            .build()
            .getQueryParams()
            .getFirst("token");
        return token == null || token.isBlank() ? null : jwtService.validateToken(token);
    }
}
