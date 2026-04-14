package hvault.app.controller;

import org.springframework.http.ResponseEntity;
import org.springframework.jdbc.core.JdbcTemplate;
import org.springframework.web.bind.annotation.*;
import org.springframework.jdbc.support.KeyHolder;
import org.springframework.jdbc.support.GeneratedKeyHolder;
import java.sql.PreparedStatement;
import java.sql.Statement;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/games")
public class GameController {

    private final JdbcTemplate jdbcTemplate;

    public GameController(JdbcTemplate jdbcTemplate) {
        this.jdbcTemplate = jdbcTemplate;
    }

    @GetMapping
    public ResponseEntity<?> getGames() {
        String sql = "SELECT id, name, cover_url FROM games ORDER BY name ASC";
        List<Map<String, Object>> games = jdbcTemplate.queryForList(sql);
        return ResponseEntity.ok(games);
    }

    @PostMapping
    public ResponseEntity<?> addGame(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Game name cannot be empty"));
        }
        
        name = name.trim();
        
        // Check if exists
        String checkSql = "SELECT id FROM games WHERE name = ?";
        List<Long> existing = jdbcTemplate.queryForList(checkSql, Long.class, name);
        if (!existing.isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Game already exists"));
        }
        
        String sql = "INSERT INTO games (name) VALUES (?)";
        KeyHolder keyHolder = new GeneratedKeyHolder();
        final String finalName = name;
        jdbcTemplate.update(connection -> {
            PreparedStatement ps = connection.prepareStatement(sql, Statement.RETURN_GENERATED_KEYS);
            ps.setString(1, finalName);
            return ps;
        }, keyHolder);
        
        return ResponseEntity.ok(Map.of("id", keyHolder.getKey().longValue(), "name", name, "message", "Game added successfully"));
    }
}
