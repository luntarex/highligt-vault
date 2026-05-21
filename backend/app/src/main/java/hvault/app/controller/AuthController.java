package hvault.app.controller;

import hvault.app.dto.AuthMessageResponse;
import hvault.app.dto.LoginRequest;
import hvault.app.dto.LoginResponse;
import hvault.app.dto.RegisterRequest;
import hvault.app.exception.AuthRegistrationException;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

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
    public ResponseEntity<AuthMessageResponse> register(@Valid @RequestBody RegisterRequest request) {
        try {
            authService.register(request.getUsername(), request.getEmail(), request.getPassword());
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
    public ResponseEntity<?> login(@Valid @RequestBody LoginRequest request) {
        LoginResponse user = authService.login(request.getUsername(), request.getPassword());
        if (user != null) {
            return ResponseEntity.ok(user);
        } else {
            return org.springframework.http.ResponseEntity.status(401).body(new AuthMessageResponse("Invalid credentials", false));
        }
    }
}
