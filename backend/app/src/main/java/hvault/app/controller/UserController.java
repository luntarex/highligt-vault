package hvault.app.controller;

import hvault.app.dto.ApiMessageResponse;
import hvault.app.dto.UpdateUserProfileRequest;
import hvault.app.dto.UserListResponse;
import hvault.app.dto.UserProfileResponse;
import hvault.app.security.SecurityUtil;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final hvault.app.service.UserService userService;

    public UserController(hvault.app.service.UserService userService) {
        this.userService = userService;
    }

    @GetMapping
    public ResponseEntity<?> getAllUsersWithPostCount() {
        List<UserListResponse> users = userService.getAllUsersWithPostCount();
        return ResponseEntity.ok(users);
    }

    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        UserProfileResponse user = userService.getUserById(id);
        if (user != null) {
            return ResponseEntity.ok(user);
        }
        return ResponseEntity.notFound().build();
    }

    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(
        @PathVariable Long id,
        @RequestBody UpdateUserProfileRequest request,
        Authentication authentication
    ) {
        Long currentUserId = SecurityUtil.requireCurrentUserId(authentication);
        if (!SecurityUtil.isAdmin(authentication) && !currentUserId.equals(id)) {
            throw new AccessDeniedException("You do not have permission to update this profile.");
        }

        boolean updated = userService.updateProfile(id, request.getUsername(), request.getDescription(), request.getProfilePhotoUrl());
        if (updated) {
            return ResponseEntity.ok(new ApiMessageResponse("Profile updated successfully"));
        }
        return ResponseEntity.notFound().build();
    }

    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        boolean deleted = userService.deleteUser(id);
        if (deleted) {
            return ResponseEntity.ok(new ApiMessageResponse("User deleted successfully"));
        }
        return ResponseEntity.notFound().build();
    }
}
