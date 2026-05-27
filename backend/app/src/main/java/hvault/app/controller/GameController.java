package hvault.app.controller;

import hvault.app.dto.CreateGameRequest;
import hvault.app.dto.GameResponse;
import hvault.app.entity.Game;
import hvault.app.repository.GameRepository;
import hvault.app.security.SecurityUtil;
import jakarta.validation.Valid;
import org.springframework.http.ResponseEntity;
import org.springframework.security.access.AccessDeniedException;
import org.springframework.security.core.Authentication;
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
        return ResponseEntity.ok(gameRepository.findAllGames().stream()
            .map(game -> new GameResponse(game.getId(), game.getName(), game.getCoverUrl()))
            .toList());
    }

    @PostMapping
    public ResponseEntity<?> addGame(@Valid @RequestBody CreateGameRequest request, Authentication authentication) {
        if (!SecurityUtil.isAdmin(authentication)) {
            throw new AccessDeniedException("Only admins can add games.");
        }
        String name = request.getName().trim();
        if (gameRepository.findByName(name).isPresent()) {
            return ResponseEntity.badRequest().body(Map.of("error", "Game already exists"));
        }

        Game game = new Game();
        game.setName(name);
        game.setCoverUrl(request.getCoverUrl());
        Game saved = gameRepository.save(game);

        return ResponseEntity.ok(Map.of("id", saved.getId(), "name", saved.getName(), "message", "Game added successfully"));
    }
}
