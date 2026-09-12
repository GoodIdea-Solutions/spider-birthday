package com.aniversario.playlist;

import java.net.URI;
import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.util.Locale;
import java.util.Optional;
import java.util.regex.Matcher;
import java.util.regex.Pattern;

public final class YoutubeUrlParser {

    private static final Pattern VIDEO_ID = Pattern.compile("^[A-Za-z0-9_-]{11}$");
    private static final Pattern PATH_ID = Pattern.compile("/(?:embed|shorts|v|live|watch)/([A-Za-z0-9_-]{11})");

    private YoutubeUrlParser() {
    }

    public static Optional<String> extractVideoId(String raw) {
        if (raw == null || raw.isBlank()) {
            return Optional.empty();
        }

        String value = raw.trim();
        if (VIDEO_ID.matcher(value).matches()) {
            return Optional.of(value);
        }

        URI uri;
        try {
            uri = URI.create(value.contains("://") ? value : "https://" + value);
        } catch (IllegalArgumentException ex) {
            return Optional.empty();
        }

        String host = normalizeHost(uri.getHost());
        if (!isYoutubeHost(host)) {
            return Optional.empty();
        }

        Optional<String> fromQuery = queryParam(uri.getRawQuery(), "v").flatMap(YoutubeUrlParser::validId);
        if (fromQuery.isPresent()) {
            return fromQuery;
        }

        String path = uri.getPath() == null ? "" : uri.getPath();
        if (host.equals("youtu.be")) {
            String segment = path.replaceFirst("^/", "").split("/")[0];
            return validId(segment);
        }

        Matcher matcher = PATH_ID.matcher(path);
        if (matcher.find()) {
            return validId(matcher.group(1));
        }

        return Optional.empty();
    }

    public static String toYoutubeMusicUrl(String videoId) {
        return "https://music.youtube.com/watch?v=" + videoId;
    }

    private static boolean isYoutubeHost(String host) {
        return host.equals("youtu.be")
                || host.equals("youtube.com")
                || host.equals("m.youtube.com")
                || host.equals("music.youtube.com")
                || host.equals("youtube-nocookie.com");
    }

    private static String normalizeHost(String host) {
        if (host == null) {
            return "";
        }
        String value = host.toLowerCase(Locale.ROOT);
        if (value.startsWith("www.")) {
            return value.substring(4);
        }
        return value;
    }

    private static Optional<String> queryParam(String query, String name) {
        if (query == null || query.isBlank()) {
            return Optional.empty();
        }
        for (String part : query.split("&")) {
            int eq = part.indexOf('=');
            String key = eq >= 0 ? part.substring(0, eq) : part;
            if (!name.equals(key)) {
                continue;
            }
            String rawValue = eq >= 0 ? part.substring(eq + 1) : "";
            return Optional.of(URLDecoder.decode(rawValue, StandardCharsets.UTF_8));
        }
        return Optional.empty();
    }

    private static Optional<String> validId(String candidate) {
        if (candidate == null) {
            return Optional.empty();
        }
        String id = candidate.trim();
        int extra = id.indexOf('?');
        if (extra >= 0) {
            id = id.substring(0, extra);
        }
        extra = id.indexOf('&');
        if (extra >= 0) {
            id = id.substring(0, extra);
        }
        if (VIDEO_ID.matcher(id).matches()) {
            return Optional.of(id);
        }
        return Optional.empty();
    }
}
