package hvault.app.service;

import hvault.app.entity.User;
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

    public Map<String, Object> getUserById(Long id) {
        return userRepository.findProfileById(id);
    }

    public boolean updateProfile(Long id, String username, String description, String profilePhotoUrl) {
        if (username != null) {
            User existingUser = userRepository.findActiveByUsername(username).orElse(null);
            if (existingUser != null && !existingUser.getId().equals(id)) {
                throw new RuntimeException("Username '" + username + "' is already taken.");
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

    public List<Map<String, Object>> getSuggestedUsers(Long userId) {
        return userRepository.findSuggestedUsers(userId);
    }
}
