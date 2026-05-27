package hvault.app.repository;

import hvault.app.entity.ClipMetadataExample;
import java.util.List;
import java.util.Optional;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ClipMetadataExampleRepository extends JpaRepository<ClipMetadataExample, Long> {
    List<ClipMetadataExample> findTop20ByUserIdOrderByApprovedAtDesc(Long userId);

    Optional<ClipMetadataExample> findByUserIdAndSourceClipId(Long userId, Long sourceClipId);
}
