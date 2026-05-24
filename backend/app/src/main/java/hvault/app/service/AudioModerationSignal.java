package hvault.app.service;

public record AudioModerationSignal(
    boolean flagged,
    int score,
    String category,
    String transcript,
    String reason,
    String rawResult
) {
}
