package hvault.app.repository;

import hvault.app.entity.ModerationResult;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ModerationResultRepository extends JpaRepository<ModerationResult, Long> {
}
