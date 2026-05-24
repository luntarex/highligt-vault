package hvault.app.controller;

import hvault.app.dto.AuthMessageResponse;
import hvault.app.dto.LoginRequest;
import hvault.app.dto.LoginResponse;
import hvault.app.dto.RegisterRequest;
import hvault.app.exception.AuthRegistrationException;
import jakarta.validation.Valid;
import jakarta.servlet.http.HttpServletRequest;
import java.time.Duration;
import java.time.Instant;
import java.util.Map;
import java.util.concurrent.ConcurrentHashMap;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private static final int MAX_FAILED_LOGINS = 5;
    private static final Duration LOGIN_LOCKOUT = Duration.ofMinutes(15);

    private final hvault.app.service.AuthService authService;
    private final Map<String, LoginAttempt> loginAttempts = new ConcurrentHashMap<>();

    public AuthController(hvault.app.service.AuthService authService) {
        this.authService = authService;
    }

    /**
     * POST /api/auth/register
     * Register a new user.
     * Expects: { username, email, password, confirmPassword }
     */
    @PostMapping("/register")
    public ResponseEntity<AuthMessageResponse> register(@Valid @RequestBody RegisterRequest request) {
        try {
            authService.register(request.getUsername(), request.getEmail(), request.getPassword(), request.getConfirmPassword());
            return ResponseEntity.ok(new AuthMessageResponse("User registered successfully", true));
        } catch (AuthRegistrationException e) {
            return ResponseEntity.badRequest().body(new AuthMessageResponse(e.getMessage(), false));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(new AuthMessageResponse("Registration failed. Please try again later.", false));
        }
    }

    /**
     * POST /api/auth/login
     * Login and return user info.
     * Expects: { username, password }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request, HttpServletRequest servletRequest) {
        String attemptKey = loginAttemptKey(request.getUsername(), servletRequest);
        LoginAttempt attempt = loginAttempts.get(attemptKey);
        if (attempt != null && attempt.isLocked()) {
            long retryAfter = attempt.retryAfterSeconds();
            return ResponseEntity.status(429)
                .header("Retry-After", String.valueOf(retryAfter))
                .body(new AuthMessageResponse("Too many failed login attempts. Please try again later.", false));
        }

        LoginResponse user = authService.login(request.getUsername(), request.getPassword());
        if (user != null) {
            loginAttempts.remove(attemptKey);
            return ResponseEntity.ok(user);
        } else {
            registerFailedLogin(attemptKey);
            return org.springframework.http.ResponseEntity.status(401).body(new AuthMessageResponse("Invalid credentials", false));
        }
    }

    private void registerFailedLogin(String attemptKey) {
        loginAttempts.compute(attemptKey, (key, existing) -> {
            if (existing == null || existing.expired()) {
                return new LoginAttempt(1, Instant.now().plus(LOGIN_LOCKOUT));
            }
            return new LoginAttempt(existing.failures() + 1, existing.lockedUntil());
        });
    }

    private String loginAttemptKey(String username, HttpServletRequest request) {
        String forwardedFor = request.getHeader("X-Forwarded-For");
        String ip = forwardedFor == null || forwardedFor.isBlank()
            ? request.getRemoteAddr()
            : forwardedFor.split(",")[0].trim();
        return ip + "|" + (username == null ? "" : username.trim().toLowerCase());
    }

    private record LoginAttempt(int failures, Instant lockedUntil) {
        boolean isLocked() {
            return failures >= MAX_FAILED_LOGINS && Instant.now().isBefore(lockedUntil);
        }

        boolean expired() {
            return Instant.now().isAfter(lockedUntil);
        }

        long retryAfterSeconds() {
            return Math.max(1, Duration.between(Instant.now(), lockedUntil).toSeconds());
        }
    }
}
