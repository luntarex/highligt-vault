package hvault.app.controller;

import hvault.app.exception.AuthRegistrationException;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import hvault.app.dto.LoginResponse;
import java.util.Map;

@RestController
@RequestMapping("/api/auth")
public class AuthController {
    private final hvault.app.service.AuthService authService;

    public AuthController(hvault.app.service.AuthService authService) {
        this.authService = authService;
    }

    /**
     * POST /api/auth/register
     * Register a new user.
     * Expects: { username, email, password, confirmPassword }
     */
    @PostMapping("/register")
    public ResponseEntity<?> register(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String email = request.get("email");
        String password = request.get("password");
        
        try {
            authService.register(username, email, password);
            return ResponseEntity.ok(Map.of("message", "User registered successfully", "success", true));
        } catch (AuthRegistrationException e) {
            return ResponseEntity.badRequest().body(Map.of("message", e.getMessage(), "success", false));
        } catch (Exception e) {
            return ResponseEntity.internalServerError().body(Map.of(
                "message", "Registration failed. Please try again later.",
                "success", false
            ));
        }
    }

    /**
     * POST /api/auth/login
     * Login and return user info.
     * Expects: { username, password }
     */
    @PostMapping("/login")
    public ResponseEntity<?> login(@RequestBody Map<String, String> request) {
        String username = request.get("username");
        String password = request.get("password");
        
        LoginResponse user = authService.login(username, password);
        if (user != null) {
            return ResponseEntity.ok(user);
        } else {
            return org.springframework.http.ResponseEntity.status(401).body(Map.of("message", "Invalid credentials", "success", false));
        }
    }
}

