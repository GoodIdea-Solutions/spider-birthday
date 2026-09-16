import { Component, OnInit, computed, inject } from '@angular/core';
import { MusicaPlaylist } from '../../core/models/party.models';
import { PlaylistPlayerService } from '../../core/services/playlist-player.service';

@Component({
  selector: 'app-playlist-page',
  templateUrl: './playlist-page.html',
  styleUrl: './playlist-page.scss',
})
export class PlaylistPageComponent implements OnInit {
  readonly player = inject(PlaylistPlayerService);

  readonly tracks = this.player.tracks;
  readonly current = this.player.current;
  readonly playing = this.player.playing;
  readonly loading = computed(() => !this.player.loaded());
  readonly error = computed(() =>
    this.player.loadError() ? 'A playlist ainda não pôde ser carregada.' : null
  );

  ngOnInit() {
    this.player.load();
  }

  thumbnail(track: MusicaPlaylist): string {
    return `https://i.ytimg.com/vi/${track.youtubeVideoId}/hqdefault.jpg`;
  }

  trackActionLabel(track: MusicaPlaylist): string {
    if (this.player.isCurrent(track) && this.playing() && !this.player.autoplayBlocked()) {
      return 'Pausar';
    }
    return 'Tocar';
  }

  onTrackAction(track: MusicaPlaylist): void {
    if (this.player.autoplayBlocked()) {
      this.player.playTrack(track);
      return;
    }
    if (this.player.isCurrent(track) && this.playing()) {
      this.player.pause(true);
      return;
    }
    this.player.playTrack(track);
  }

  toggleCurrent(): void {
    this.player.toggle();
  }
}
