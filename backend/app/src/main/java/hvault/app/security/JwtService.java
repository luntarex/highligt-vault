package hvault.app.security;

import java.nio.charset.StandardCharsets;
import java.time.Instant;
import java.util.Base64;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

import javax.crypto.Mac;
import javax.crypto.spec.SecretKeySpec;

import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class JwtService {
    private static final String HMAC_ALGORITHM = "HmacSHA256";
    private static final Base64.Encoder BASE64_URL_ENCODER = Base64.getUrlEncoder().withoutPadding();
    private static final Base64.Decoder BASE64_URL_DECODER = Base64.getUrlDecoder();

    @Value("${app.jwt.secret}")
    private String jwtSecret;

    @Value("${app.jwt.expiration-seconds:86400}")
    private long expirationSeconds;

    public String createToken(Long userId, String username, boolean isAdmin, int tokenVersion) {
        try {
            long now = Instant.now().getEpochSecond();
            String header = "{\"alg\":\"HS256\",\"typ\":\"JWT\"}";
            String payload = "{"
                + "\"sub\":\"" + escapeJson(userId.toString()) + "\","
                + "\"username\":\"" + escapeJson(username) + "\","
                + "\"role\":\"" + (isAdmin ? "ADMIN" : "USER") + "\","
                + "\"ver\":" + tokenVersion + ","
                + "\"iat\":" + now + ","
                + "\"exp\":" + (now + expirationSeconds)
                + "}";

            String encodedHeader = encode(header);
            String encodedPayload = encode(payload);
            String unsignedToken = encodedHeader + "." + encodedPayload;
            return unsignedToken + "." + sign(unsignedToken);
        } catch (Exception e) {
            throw new IllegalStateException("Could not create authentication token.");
        }
    }

    public JwtClaims validateToken(String token) {
        try {
            String[] parts = token.split("\\.");
            if (parts.length != 3) {
                return null;
            }

            String unsignedToken = parts[0] + "." + parts[1];
            if (!constantTimeEquals(sign(unsignedToken), parts[2])) {
                return null;
            }

            String payload = new String(BASE64_URL_DECODER.decode(parts[1]), StandardCharsets.UTF_8);

            long exp = Long.parseLong(extractNumber(payload, "exp"));
            if (Instant.now().getEpochSecond() >= exp) {
                return null;
            }

            Long userId = Long.valueOf(extractString(payload, "sub"));
            String username = extractString(payload, "username");
            String role = extractString(payload, "role");
            int tokenVersion = Integer.parseInt(extractNumber(payload, "ver"));
            return new JwtClaims(userId, username, role, tokenVersion);
        } catch (Exception e) {
            return null;
        }
    }

    private String encode(String value) {
        return BASE64_URL_ENCODER.encodeToString(value.getBytes(StandardCharsets.UTF_8));
    }

    private String escapeJson(String value) {
        return value.replace("\\", "\\\\").replace("\"", "\\\"");
    }

    private String extractString(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*\"([^\"]*)\"");
        Matcher matcher = pattern.matcher(json);
        if (!matcher.find()) {
            throw new IllegalArgumentException("Missing JWT claim.");
        }
        return matcher.group(1).replace("\\\"", "\"").replace("\\\\", "\\");
    }

    private String extractNumber(String json, String key) {
        Pattern pattern = Pattern.compile("\"" + Pattern.quote(key) + "\"\\s*:\\s*(\\d+)");
        Matcher matcher = pattern.matcher(json);
        if (!matcher.find()) {
            throw new IllegalArgumentException("Missing JWT claim.");
        }
        return matcher.group(1);
    }

    private String sign(String value) throws Exception {
        Mac mac = Mac.getInstance(HMAC_ALGORITHM);
        mac.init(new SecretKeySpec(jwtSecret.getBytes(StandardCharsets.UTF_8), HMAC_ALGORITHM));
        return BASE64_URL_ENCODER.encodeToString(mac.doFinal(value.getBytes(StandardCharsets.UTF_8)));
    }

    private boolean constantTimeEquals(String a, String b) {
        byte[] aBytes = a.getBytes(StandardCharsets.UTF_8);
        byte[] bBytes = b.getBytes(StandardCharsets.UTF_8);
        if (aBytes.length != bBytes.length) {
            return false;
        }
        int result = 0;
        for (int i = 0; i < aBytes.length; i++) {
            result |= aBytes[i] ^ bBytes[i];
        }
        return result == 0;
    }

    public record JwtClaims(Long userId, String username, String role, int tokenVersion) {}
}
