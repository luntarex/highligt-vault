package hvault.app.service;

import hvault.app.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.Map;

@Service
public class AuthService {
    private final UserRepository userRepository;

    public AuthService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public Map<String, Object> login(String username, String password) {
        Map<String, Object> user = userRepository.findByUsername(username);
        // Extremely simple auth for DB project purposes
        if (user != null && "dummy_hash".equals(user.get("password_hash"))) {
            user.remove("password_hash"); // don't send password back!
            return user;
        }
        return null;
    }

    public boolean register(String username, String email, String password) {
        if (userRepository.findByUsername(username) != null) {
            return false;
        }
        // Save "dummy_hash" for everyone to avoid managing real bcrytp hashing for this class
        userRepository.insertUser(username, email, "dummy_hash");
        return true;
    }
}
