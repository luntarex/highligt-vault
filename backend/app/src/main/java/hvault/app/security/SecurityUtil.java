package hvault.app.security;

import org.springframework.security.core.Authentication;
import org.springframework.security.core.GrantedAuthority;

public final class SecurityUtil {
    private SecurityUtil() {
    }

    public static Long currentUserId(Authentication authentication) {
        if (authentication != null && authentication.getDetails() instanceof JwtService.JwtClaims claims) {
            return claims.userId();
        }
        return null;
    }

    public static Long requireCurrentUserId(Authentication authentication) {
        Long userId = currentUserId(authentication);
        if (userId == null) {
            throw new org.springframework.security.access.AccessDeniedException("Authentication is required.");
        }
        return userId;
    }

    public static boolean isAdmin(Authentication authentication) {
        if (authentication == null) {
            return false;
        }
        return authentication.getAuthorities().stream()
            .map(GrantedAuthority::getAuthority)
            .anyMatch("ROLE_ADMIN"::equals);
    }
}
