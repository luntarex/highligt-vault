package hvault.app.dto;

import java.util.List;

import lombok.Data;
import lombok.EqualsAndHashCode;

@Data
@EqualsAndHashCode(callSuper = true)
public class ClipGroupDetailResponse extends ClipGroupResponse {
    private List<ClipResponse> clips;
}
