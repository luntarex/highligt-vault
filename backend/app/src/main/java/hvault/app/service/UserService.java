package hvault.app.service;

import hvault.app.dto.SuggestedUserResponse;
import hvault.app.dto.UserCompactResponse;
import hvault.app.dto.UserListResponse;
import hvault.app.dto.UserProfileResponse;
import hvault.app.entity.User;
import hvault.app.repository.UserRepository;
import hvault.app.repository.projection.SuggestedUserView;
import hvault.app.repository.projection.UserCompactView;
import hvault.app.repository.projection.UserListView;
import hvault.app.repository.projection.UserProfileView;
import org.springframework.stereotype.Service;

import java.util.List;
import java.util.NoSuchElementException;

@Service
public class UserService {
    private final UserRepository userRepository;

    public UserService(UserRepository userRepository) {
        this.userRepository = userRepository;
    }

    public List<UserListResponse> getAllUsersWithPostCount() {
        return userRepository.findAllUsersWithPostCount().stream()
            .map(this::toUserListResponse)
            .toList();
    }

    public UserProfileResponse getUserById(Long id) {
        UserProfileView user = userRepository.findProfileById(id);
        return user == null ? null : toUserProfileResponse(user);
    }

    public boolean updateProfile(Long id, String username, String description, String profilePhotoUrl) {
        if (username != null) {
            User existingUser = userRepository.findActiveByUsername(username).orElse(null);
            if (existingUser != null && !existingUser.getId().equals(id)) {
                throw new IllegalArgumentException("This username is already taken.");
            }
        }
        return userRepository.updateProfile(id, username, description, profilePhotoUrl) > 0;
    }

    public void followUser(Long followerId, Long followedId) {
        if (followerId.equals(followedId)) {
            throw new IllegalArgumentException("You cannot follow yourself.");
        }
        if (!userRepository.existsById(followedId)) {
            throw new NoSuchElementException("User not found.");
        }
        userRepository.followUser(followerId, followedId);
    }

    public void unfollowUser(Long followerId, Long followedId) {
        if (followerId.equals(followedId)) {
            throw new IllegalArgumentException("You cannot unfollow yourself.");
        }
        userRepository.unfollowUser(followerId, followedId);
    }

    public boolean isFollowing(Long followerId, Long followedId) {
        return userRepository.isFollowing(followerId, followedId);
    }

    public boolean deleteUser(Long id) {
        return userRepository.softDeleteUser(id) > 0;
    }

    public List<UserCompactResponse> getFollowers(Long userId) {
        return userRepository.findFollowers(userId).stream()
            .map(this::toUserCompactResponse)
            .toList();
    }

    public List<UserCompactResponse> getFollowing(Long userId) {
        return userRepository.findFollowing(userId).stream()
            .map(this::toUserCompactResponse)
            .toList();
    }

    public List<SuggestedUserResponse> getSuggestedUsers(Long userId) {
        return userRepository.findSuggestedUsers(userId).stream()
            .map(this::toSuggestedUserResponse)
            .toList();
    }

    private UserListResponse toUserListResponse(UserListView user) {
        return new UserListResponse(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getDescription(),
            user.getProfilePhotoUrl(),
            user.getCreatedAt(),
            Boolean.TRUE.equals(user.getIsAdmin()),
            user.getPostCount(),
            user.getTotalClips(),
            user.getPublicClipCount(),
            user.getTotalFavorites()
        );
    }

    private UserProfileResponse toUserProfileResponse(UserProfileView user) {
        return new UserProfileResponse(
            user.getId(),
            user.getUsername(),
            user.getEmail(),
            user.getDescription(),
            user.getProfilePhotoUrl(),
            Boolean.TRUE.equals(user.getIsAdmin()),
            user.getCreatedAt(),
            user.getFollowers(),
            user.getFollowing(),
            user.getTotalClips(),
            user.getTotalFavorites()
        );
    }

    private UserCompactResponse toUserCompactResponse(UserCompactView user) {
        return new UserCompactResponse(user.getId(), user.getUsername(), user.getProfilePhotoUrl());
    }

    private SuggestedUserResponse toSuggestedUserResponse(SuggestedUserView user) {
        return new SuggestedUserResponse(
            user.getId(),
            user.getUsername(),
            user.getProfilePhotoUrl(),
            user.getDescription(),
            user.getMutualCount(),
            user.getFollowers()
        );
    }
}
