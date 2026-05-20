package hvault.app.repository;

import hvault.app.entity.Game;
import hvault.app.repository.projection.GameView;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface GameRepository extends JpaRepository<Game, Long> {
    Optional<Game> findByName(String name);

    @Query(value = "SELECT id, name, cover_url AS coverUrl FROM games ORDER BY name ASC", nativeQuery = true)
    List<GameView> findAllGames();
}
