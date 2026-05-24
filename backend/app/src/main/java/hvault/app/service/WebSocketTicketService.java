package hvault.app.service;

import java.security.SecureRandom;
import java.time.Duration;
import java.time.Instant;
import java.util.Base64;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.stereotype.Service;

@Service
public class WebSocketTicketService {
    private static final Duration TICKET_TTL = Duration.ofSeconds(30);
    private static final SecureRandom SECURE_RANDOM = new SecureRandom();

    private final Map<String, Ticket> tickets = new ConcurrentHashMap<>();

    public String issueTicket(Long userId) {
        pruneExpiredTickets();
        byte[] bytes = new byte[32];
        SECURE_RANDOM.nextBytes(bytes);
        String ticket = Base64.getUrlEncoder().withoutPadding().encodeToString(bytes);
        tickets.put(ticket, new Ticket(userId, Instant.now().plus(TICKET_TTL)));
        return ticket;
    }

    public Long consumeTicket(String ticket) {
        if (ticket == null || ticket.isBlank()) {
            return null;
        }

        Ticket stored = tickets.remove(ticket);
        if (stored == null || stored.expiresAt().isBefore(Instant.now())) {
            return null;
        }
        return stored.userId();
    }

    private void pruneExpiredTickets() {
        Instant now = Instant.now();
        tickets.entrySet().removeIf(entry -> entry.getValue().expiresAt().isBefore(now));
    }

    private record Ticket(Long userId, Instant expiresAt) {
    }
}
