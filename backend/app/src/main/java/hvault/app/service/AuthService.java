package hvault.app.service;

import hvault.app.repository.UserRepository;
import org.springframework.security.crypto.bcrypt.BCryptPasswordEncoder;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {
    private final UserRepository userRepository;
    private final BCryptPasswordEncoder passwordEncoder = new BCryptPasswordEncoder();

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Map<String, Object> login(String username, String password) {
        Map<String, Object> user = userRepository.findByUsername(username);
        if (user != null) {
            String storedHash = (String) user.get("password_hash");
            if (passwordEncoder.matches(password, storedHash)) {
                user.remove("password_hash");
                return user;
            }
        }
        return null;
    }

    public boolean register(String username, String email, String password) {
        if (userRepository.findByUsername(username) != null) {
            return false;
        }
        String hashedPassword = passwordEncoder.encode(password);
        userRepository.insertUser(username, email, hashedPassword);
        return true;
    }
}
