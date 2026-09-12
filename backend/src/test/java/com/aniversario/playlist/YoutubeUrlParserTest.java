package com.aniversario.playlist;

import org.junit.jupiter.api.Test;
import org.junit.jupiter.params.ParameterizedTest;
import org.junit.jupiter.params.provider.CsvSource;
import org.junit.jupiter.params.provider.ValueSource;

import static org.assertj.core.api.Assertions.assertThat;

class YoutubeUrlParserTest {

    @ParameterizedTest
    @CsvSource({
            "https://music.youtube.com/watch?v=dQw4w9WgXcQ,dQw4w9WgXcQ",
            "https://music.youtube.com/watch?v=dQw4w9WgXcQ&list=RDAMVM123,dQw4w9WgXcQ",
            "https://www.youtube.com/watch?v=dQw4w9WgXcQ,dQw4w9WgXcQ",
            "https://youtube.com/watch?v=dQw4w9WgXcQ,dQw4w9WgXcQ",
            "https://m.youtube.com/watch?v=dQw4w9WgXcQ,dQw4w9WgXcQ",
            "https://youtu.be/dQw4w9WgXcQ,dQw4w9WgXcQ",
            "https://www.youtu.be/dQw4w9WgXcQ,dQw4w9WgXcQ",
            "https://www.youtube.com/embed/dQw4w9WgXcQ,dQw4w9WgXcQ",
            "https://www.youtube.com/shorts/dQw4w9WgXcQ,dQw4w9WgXcQ",
            "youtu.be/dQw4w9WgXcQ,dQw4w9WgXcQ",
            "dQw4w9WgXcQ,dQw4w9WgXcQ"
    })
    void extraiVideoIdDeUrlsValidas(String url, String expected) {
        assertThat(YoutubeUrlParser.extractVideoId(url)).contains(expected);
    }

    @ParameterizedTest
    @ValueSource(strings = {
            "",
            "   ",
            "https://example.com/watch?v=dQw4w9WgXcQ",
            "https://music.youtube.com/playlist?list=PLxyz",
            "https://youtube.com/watch?v=curto",
            "not-a-url"
    })
    void rejeitaUrlsInvalidas(String url) {
        assertThat(YoutubeUrlParser.extractVideoId(url)).isEmpty();
    }

    @Test
    void rejeitaNulo() {
        assertThat(YoutubeUrlParser.extractVideoId(null)).isEmpty();
    }

    @Test
    void montaLinkDoYoutubeMusic() {
        assertThat(YoutubeUrlParser.toYoutubeMusicUrl("dQw4w9WgXcQ"))
                .isEqualTo("https://music.youtube.com/watch?v=dQw4w9WgXcQ");
    }
}
