package hvault.app.service;

public record VisualModerationSignal(
    boolean flagged,
    int score,
    String category,
    String reason,
    String rawResult
) {
}
