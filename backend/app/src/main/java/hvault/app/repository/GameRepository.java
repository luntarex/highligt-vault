package hvault.app.repository;

import hvault.app.entity.Game;
import java.util.List;
import java.util.Map;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.data.jpa.repository.Query;
import org.springframework.stereotype.Repository;

@Repository
public interface GameRepository extends JpaRepository<Game, Long> {
    Optional<Game> findByName(String name);

    @Query(value = "SELECT id, name, cover_url FROM games ORDER BY name ASC", nativeQuery = true)
    List<Map<String, Object>> findAllGames();
}
