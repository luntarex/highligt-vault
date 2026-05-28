package hvault.app.service;

import java.util.ArrayList;
import java.util.List;
import java.util.Optional;
import java.util.concurrent.CompletableFuture;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.atomic.AtomicInteger;
import java.util.regex.Matcher;
import java.util.regex.Pattern;
import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.core.io.ByteArrayResource;
import org.springframework.http.HttpEntity;
import org.springframework.http.HttpHeaders;
import org.springframework.http.MediaType;
import org.springframework.stereotype.Service;
import jakarta.annotation.PreDestroy;
import org.springframework.util.LinkedMultiValueMap;
import org.springframework.util.MultiValueMap;
import org.springframework.web.client.RestTemplate;

@Service
public class OpenAiAudioTranscriptionService {
    private static final Logger logger = LoggerFactory.getLogger(OpenAiAudioTranscriptionService.class);
    private static final String TRANSCRIPTIONS_URL = "https://api.openai.com/v1/audio/transcriptions";

    private final RestTemplate restTemplate = new RestTemplate();
    private static final AtomicInteger TRANSCRIPTION_THREAD_COUNTER = new AtomicInteger();
    private final ExecutorService transcriptionExecutor = Executors.newFixedThreadPool(4, runnable -> {
        Thread thread = new Thread(runnable, "whisper-transcribe-" + TRANSCRIPTION_THREAD_COUNTER.incrementAndGet());
        thread.setDaemon(true);
        return thread;
    });

    @PreDestroy
    public void shutdownTranscriptionExecutor() {
        transcriptionExecutor.shutdown();
    }

    @Value("${app.moderation.ai.enabled:false}")
    private boolean enabled;

    @Value("${app.metadata.ai.audio.transcription.enabled:true}")
    private boolean metadataTranscriptionEnabled;

    @Value("${openai.api-key:}")
    private String apiKey;

    @Value("${app.moderation.ai.transcription-model:gpt-4o-mini-transcribe}")
    private String transcriptionModel;

    public Optional<String> transcribeSamples(List<AudioModerationSample> samples) {
        return transcribeSamples(samples, enabled);
    }

    public Optional<String> transcribeSamplesForMetadata(List<AudioModerationSample> samples) {
        return transcribeSamples(samples, metadataTranscriptionEnabled);
    }

    private Optional<String> transcribeSamples(List<AudioModerationSample> samples, boolean allowed) {
        if (!allowed || apiKey == null || apiKey.isBlank() || samples == null || samples.isEmpty()) {
            return Optional.empty();
        }

        // Launch all Whisper transcriptions in parallel
        List<CompletableFuture<Optional<String>>> futures = samples.stream()
            .map(sample -> CompletableFuture.supplyAsync(
                () -> transcribeSample(sample)
                    .filter(text -> !text.isBlank())
                    .map(text -> "[audio " + sample.startSecond() + "s] " + text),
                transcriptionExecutor
            ))
            .toList();

        List<String> transcripts = futures.stream()
            .map(CompletableFuture::join)
            .filter(Optional::isPresent)
            .map(Optional::get)
            .toList();

        if (transcripts.isEmpty()) {
            return Optional.empty();
        }
        return Optional.of(String.join(" | ", transcripts));
    }

    private Optional<String> transcribeSample(AudioModerationSample sample) {
        try {
            HttpHeaders headers = new HttpHeaders();
            headers.setBearerAuth(apiKey);
            headers.setContentType(MediaType.MULTIPART_FORM_DATA);

            MultiValueMap<String, Object> body = new LinkedMultiValueMap<>();
            body.add("model", transcriptionModel);
            body.add("response_format", "json");
            body.add("prompt", "Gaming highlight clip. May contain reactions, callouts, laughter, rage.");
            body.add("file", new ByteArrayResource(sample.bytes()) {
                @Override
                public String getFilename() {
                    return sample.filename();
                }
            });

            String response = restTemplate.postForObject(
                TRANSCRIPTIONS_URL,
                new HttpEntity<>(body, headers),
                String.class
            );

            return extractString(response, "text");
        } catch (Exception e) {
            logger.warn("OpenAI audio transcription failed for {}s sample: {}", sample.startSecond(), safeMessage(e));
            return Optional.empty();
        }
    }

    private Optional<String> extractString(String json, String key) {
        if (json == null || json.isBlank()) {
            return Optional.empty();
        }
        Matcher matcher = Pattern.compile("\\\"" + Pattern.quote(key) + "\\\"\\s*:\\s*\\\"((?:\\\\.|[^\\\"])*)\\\"")
            .matcher(json);
        return matcher.find() ? Optional.of(unescapeJson(matcher.group(1))) : Optional.empty();
    }

    private String unescapeJson(String value) {
        return value.replace("\\\"", "\"").replace("\\\\", "\\");
    }

    private String safeMessage(Exception e) {
        return e.getMessage() == null ? e.getClass().getSimpleName() : e.getMessage();
    }
}
