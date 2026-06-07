package hvault.app.service;

import hvault.app.dto.LoginResponse;
import hvault.app.entity.User;
import hvault.app.exception.AuthRegistrationException;
import hvault.app.repository.UserRepository;
import hvault.app.security.JwtService;
import java.time.LocalDateTime;
import java.util.Locale;
import java.util.Set;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();
    private static final Set<String> COMMON_PASSWORDS = Set.of(
        "password", "password1", "password123", "123456", "12345678", "123456789",
        "qwerty", "qwerty123", "admin", "admin123", "letmein", "welcome", "iloveyou"
    );

    public AuthService(UserRepository userRepository, JwtService jwtService) {
        this.userRepository = userRepository;
        this.jwtService = jwtService;
    }

    public LoginResponse login(String username, String password) {
        return userRepository.findActiveByUsername(username)
            .filter(user -> passwordEncoder.matches(password, user.getPasswordHash()))
            .map(user -> {
                boolean isAdmin = Boolean.TRUE.equals(user.getIsAdmin());
                String token = jwtService.createToken(user.getId(), user.getUsername(), isAdmin);
                return new LoginResponse(
                    user.getId(),
                    user.getUsername(),
                    user.getEmail(),
                    user.getProfilePhotoUrl(),
                    isAdmin,
                    token,
                    true
                );
            })
            .orElse(null);
    }

    public void register(String username, String email, String password, String confirmPassword) {
        validatePassword(username, email, password, confirmPassword);

        if (userRepository.findActiveByUsername(username).isPresent()) {
            throw new AuthRegistrationException("Username is already taken.");
        }
        if (userRepository.findActiveByEmail(email).isPresent()) {
            throw new AuthRegistrationException("Email is already registered.");
        }

        User user = new User();
        user.setUsername(username);
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(password));
        user.setProfilePhotoUrl("https://i.pravatar.cc/150?img=1");
        user.setIsAdmin(false);
        user.setIsDeleted(false);
        user.setTrustScore(100);
        user.setViolationCount(0);
        user.setCreatedAt(LocalDateTime.now());

        try {
            userRepository.save(user);
        } catch (DataIntegrityViolationException e) {
            throw new AuthRegistrationException("Username or email is already registered.");
        }
    }

    private void validatePassword(String username, String email, String password, String confirmPassword) {
        if (password == null || password.isBlank()) {
            throw new AuthRegistrationException("Password is required.");
        }
        if (confirmPassword != null && !password.equals(confirmPassword)) {
            throw new AuthRegistrationException("Passwords do not match.");
        }

        String normalized = password.toLowerCase(Locale.ROOT);
        if (password.length() < 8
            || !password.matches(".*\\p{Lu}.*")
            || !password.matches(".*[\\p{P}\\p{S}].*")) {
            throw new AuthRegistrationException("Password must be at least 8 characters and include one uppercase letter and one symbol.");
        }
        if (COMMON_PASSWORDS.contains(normalized)) {
            throw new AuthRegistrationException("Please choose a less common password.");
        }
        if (username != null && username.length() >= 3 && normalized.contains(username.toLowerCase(Locale.ROOT))) {
            throw new AuthRegistrationException("Password cannot contain your username.");
        }
        String emailPrefix = email == null ? "" : email.split("@")[0].toLowerCase(Locale.ROOT);
        if (emailPrefix.length() >= 3 && normalized.contains(emailPrefix)) {
            throw new AuthRegistrationException("Password cannot contain your email name.");
        }
    }
}
