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

    public boolean updateProfile(Long id, String description, String profilePhotoUrl) {
        return userRepository.updateProfile(id, description, profilePhotoUrl) > 0;
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
}
