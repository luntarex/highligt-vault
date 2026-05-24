package hvault.app.repository;

import hvault.app.entity.ModerationAction;
import hvault.app.enums.ModerationActionType;
import hvault.app.enums.ReportTargetType;
import java.util.Collection;
import java.util.List;
import org.springframework.data.jpa.repository.JpaRepository;
import org.springframework.stereotype.Repository;

@Repository
public interface ModerationActionRepository extends JpaRepository<ModerationAction, Long> {
    List<ModerationAction> findTop20ByTargetTypeAndActionInAndReasonIsNotNullOrderByCreatedAtDesc(
        ReportTargetType targetType,
        Collection<ModerationActionType> actions
    );
}
