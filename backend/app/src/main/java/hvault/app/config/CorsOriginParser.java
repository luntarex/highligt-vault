package hvault.app.config;

import java.util.Arrays;
import java.util.List;

public final class CorsOriginParser {
    private CorsOriginParser() {
    }

    public static List<String> parse(String allowedOrigins) {
        return Arrays.stream(allowedOrigins.split(","))
            .map(String::trim)
            .map(CorsOriginParser::removeTrailingSlash)
            .filter(origin -> !origin.isBlank())
            .toList();
    }

    public static String[] parseArray(String allowedOrigins) {
        return parse(allowedOrigins).toArray(String[]::new);
    }

    private static String removeTrailingSlash(String origin) {
        if (origin.length() > 1 && origin.endsWith("/")) {
            return origin.substring(0, origin.length() - 1);
        }
        return origin;
    }
}
