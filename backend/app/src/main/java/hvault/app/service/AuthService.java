package hvault.app.service;

import hvault.app.dto.LoginResponse;
import hvault.app.entity.User;
import hvault.app.exception.AuthRegistrationException;
import hvault.app.repository.UserRepository;
import hvault.app.security.JwtService;
import java.time.LocalDateTime;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final JwtService jwtService;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

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

    public void register(String username, String email, String password) {
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
}
