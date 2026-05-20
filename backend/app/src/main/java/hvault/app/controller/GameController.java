package hvault.app.controller;

import hvault.app.entity.Game;
import hvault.app.repository.GameRepository;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/games")
public class GameController {

    private final GameRepository gameRepository;

    public GameController(GameRepository gameRepository) {
        this.gameRepository = gameRepository;
    }

    @GetMapping
    public ResponseEntity<?> getGames() {
        return ResponseEntity.ok(gameRepository.findAllGames());
    }

    @PostMapping
    public ResponseEntity<?> addGame(@RequestBody Map<String, String> request) {
        String name = request.get("name");
        if (name == null || name.trim().isEmpty()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Game name cannot be empty"));
        }

        name = name.trim();
        if (gameRepository.findByName(name).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Game already exists"));
        }

        Game game = new Game();
        game.setName(name);
        Game saved = gameRepository.save(game);

        return ResponseEntity.ok(Map.of("id", saved.getId(), "name", saved.getName(), "message", "Game added successfully"));
    }
}
