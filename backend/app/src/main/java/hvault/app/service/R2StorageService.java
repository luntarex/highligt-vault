package hvault.app.service;

import java.net.URI;
import java.nio.file.Path;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

import jakarta.annotation.PostConstruct;
import software.amazon.awssdk.auth.credentials.AwsBasicCredentials;
import software.amazon.awssdk.auth.credentials.StaticCredentialsProvider;
import software.amazon.awssdk.core.sync.RequestBody;
import software.amazon.awssdk.regions.Region;
import software.amazon.awssdk.services.s3.S3Client;
import software.amazon.awssdk.services.s3.model.DeleteObjectRequest;
import software.amazon.awssdk.services.s3.model.PutObjectRequest;

/**
 * Thin wrapper over an S3 client pointed at a Cloudflare R2 bucket.
 *
 * R2 speaks the S3 API, so the AWS SDK works with a custom endpoint
 * ({@code https://<account-id>.r2.cloudflarestorage.com}), the "auto" region,
 * and path-style addressing. Public delivery happens through a separate public
 * base URL (a custom domain or the bucket's r2.dev URL), not through the S3 API.
 *
 * The whole service is gated by {@code r2.enabled}: when off (or misconfigured)
 * {@link #isEnabled()} returns false and callers fall back to Cloudinary.
 */
@Service
public class R2StorageService {
    private static final Logger logger = LoggerFactory.getLogger(R2StorageService.class);

    @Value("${r2.enabled:false}")
    private boolean enabled;

    @Value("${r2.account-id:}")
    private String accountId;

    @Value("${r2.access-key:}")
    private String accessKey;

    @Value("${r2.secret-key:}")
    private String secretKey;

    @Value("${r2.bucket:}")
    private String bucket;

    @Value("${r2.public-base-url:}")
    private String publicBaseUrl;

    private S3Client client;

    @PostConstruct
    void init() {
        if (!enabled) {
            return;
        }
        if (isBlank(accountId) || isBlank(accessKey) || isBlank(secretKey)
            || isBlank(bucket) || isBlank(publicBaseUrl)) {
            logger.warn("r2.enabled=true but R2 config is incomplete (account-id/access-key/secret-key/bucket/public-base-url). R2 storage disabled.");
            enabled = false;
            return;
        }

        this.client = S3Client.builder()
            .endpointOverride(URI.create("https://" + accountId + ".r2.cloudflarestorage.com"))
            .region(Region.of("auto"))
            .credentialsProvider(StaticCredentialsProvider.create(
                AwsBasicCredentials.create(accessKey, secretKey)))
            .forcePathStyle(true)
            .build();
        logger.info("R2 storage enabled (bucket={}).", bucket);
    }

    public boolean isEnabled() {
        return enabled && client != null;
    }

    public void putObject(String key, Path file, String contentType) {
        client.putObject(
            PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
            RequestBody.fromFile(file));
    }

    public void putObject(String key, byte[] data, String contentType) {
        client.putObject(
            PutObjectRequest.builder().bucket(bucket).key(key).contentType(contentType).build(),
            RequestBody.fromBytes(data));
    }

    /** Best-effort delete; logs and returns false on failure so callers never break on cleanup. */
    public boolean deleteObject(String key) {
        if (isBlank(key)) {
            return false;
        }
        try {
            client.deleteObject(DeleteObjectRequest.builder().bucket(bucket).key(key).build());
            return true;
        } catch (Exception e) {
            logger.warn("R2 delete failed for {}: {}", key, e.getMessage());
            return false;
        }
    }

    public String publicUrl(String key) {
        String base = publicBaseUrl.endsWith("/")
            ? publicBaseUrl.substring(0, publicBaseUrl.length() - 1)
            : publicBaseUrl;
        return base + "/" + key;
    }

    private boolean isBlank(String value) {
        return value == null || value.isBlank();
    }
}
