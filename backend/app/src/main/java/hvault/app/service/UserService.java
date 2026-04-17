package hvault.app.service;

import hvault.app.repository.UserRepository;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.Map;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<Map<String, Object>> getAllUsersWithPostCount() {
        return userRepository.findAllUsersWithPostCount();
    }
    
    public java.util.Map<String, Object> getUserById(Long id) {
        return userRepository.findById(id);
    }

    public boolean updateProfile(Long id, String username, String description, String profilePhotoUrl) {
        if (username != null) {
            Map<String, Object> existingUser = userRepository.findByUsername(username);
            // If username exists and it's NOT the current user's current username
            if (existingUser != null) {
                Long foundId = Long.valueOf(existingUser.get("id").toString());
                if (!foundId.equals(id)) {
                    throw new RuntimeException("Username '" + username + "' is already taken.");
                }
            }
        }
        return userRepository.updateProfile(id, username, description, profilePhotoUrl) > 0;
    }

    public void followUser(Long followerId, Long followedId) {
        userRepository.followUser(followerId, followedId);
    }

    public void unfollowUser(Long followerId, Long followedId) {
        userRepository.unfollowUser(followerId, followedId);
    }

    public boolean isFollowing(Long followerId, Long followedId) {
        return userRepository.isFollowing(followerId, followedId);
    }

    public boolean deleteUser(Long id) {
        return userRepository.softDeleteUser(id) > 0;
    }

    public List<Map<String, Object>> getFollowers(Long userId) {
        return userRepository.findFollowers(userId);
    }

    public List<Map<String, Object>> getFollowing(Long userId) {
        return userRepository.findFollowing(userId);
    }
}
