package hvault.app.service;

public record AudioModerationSample(
    int startSecond,
    byte[] bytes,
    String filename
) {
}
