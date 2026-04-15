package hvault.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/users")
public class UserController {

    private final hvault.app.service.UserService userService;

    public UserController(hvault.app.service.UserService userService) {
        this.userService = userService;
    }

    /**
     * GET /api/users
     * List all users with their post count.
     * REQUIREMENT #2: Aggregate query — COUNT + GROUP BY
     */
    @GetMapping
    public ResponseEntity<?> getAllUsersWithPostCount() {
        List<Map<String, Object>> users = userService.getAllUsersWithPostCount();
        return ResponseEntity.ok(users);
    }

    /**
     * GET /api/users/{id}
     * Get a single user by ID.
     */
    @GetMapping("/{id}")
    public ResponseEntity<?> getUserById(@PathVariable Long id) {
        java.util.Map<String, Object> user = userService.getUserById(id);
        if (user != null) {
            return ResponseEntity.ok(user);
        } else {
            return ResponseEntity.notFound().build();
        }
    }

    /**
     * PUT /api/users/{id}
     * Update user profile.
     */
    @PutMapping("/{id}")
    public ResponseEntity<?> updateUser(@PathVariable Long id, @RequestBody Map<String, Object> request) {
        String username = (String) request.get("username");
        String description = (String) request.get("description");
        String profilePhotoUrl = (String) request.get("profilePhotoUrl");
        
        try {
            boolean updated = userService.updateProfile(id, username, description, profilePhotoUrl);
            if (updated) {
                return ResponseEntity.ok(Map.of("message", "Profile updated successfully"));
            } else {
                return ResponseEntity.notFound().build();
            }
        } catch (RuntimeException e) {
            return ResponseEntity.badRequest().body(Map.of("error", e.getMessage()));
        }
    }

    /**
     * GET /api/users/{id}
     * Delete a user (admin only).
     */
    @DeleteMapping("/{id}")
    public ResponseEntity<?> deleteUser(@PathVariable Long id) {
        // TODO: Wire to UserService
        return ResponseEntity.ok(Map.of("message", "User deleted successfully"));
    }

    @org.springframework.beans.factory.annotation.Autowired
    private org.springframework.jdbc.core.JdbcTemplate jdbcTemplate;

    @GetMapping("/debug/schema")
    public ResponseEntity<?> debugSchema() {
        try {
            List<Map<String, Object>> columns = jdbcTemplate.queryForList("DESCRIBE users");
            return ResponseEntity.ok(columns);
        } catch (Exception e) {
            return ResponseEntity.status(500).body(Map.of("error", e.getMessage()));
        }
    }
}
