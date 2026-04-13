package hvault.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
        
        boolean success = authService.register(username, email, password);
        if (success) {
            return ResponseEntity.ok(Map.of("message", "User registered successfully", "success", true));
        } else {
            return org.springframework.http.ResponseEntity.badRequest().body(Map.of("message", "Username already exists", "success", false));
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
        
        Map<String, Object> user = authService.login(username, password);
        if (user != null) {
            return ResponseEntity.ok(user);
        } else {
            return org.springframework.http.ResponseEntity.status(401).body(Map.of("message", "Invalid credentials", "success", false));
        }
    }
}
