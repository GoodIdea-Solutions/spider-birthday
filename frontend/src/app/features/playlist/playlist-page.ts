import { Component, OnInit, inject, signal } from '@angular/core';
import { MusicaPlaylist } from '../../core/models/party.models';
import { PlaylistPlayerService } from '../../core/services/playlist-player.service';
import { PlaylistService } from '../../core/services/playlist.service';

@Component({
  selector: 'app-playlist-page',
  templateUrl: './playlist-page.html',
  styleUrl: './playlist-page.scss',
})
export class PlaylistPageComponent implements OnInit {
  private readonly playlistService = inject(PlaylistService);
  readonly player = inject(PlaylistPlayerService);

  readonly tracks = signal<MusicaPlaylist[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    this.playlistService.listar().subscribe({
      next: (tracks) => {
        this.tracks.set(tracks);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('A playlist ainda não pôde ser carregada.');
        this.loading.set(false);
      },
    });
  }

  thumbnail(track: MusicaPlaylist): string {
    return `https://i.ytimg.com/vi/${track.youtubeVideoId}/hqdefault.jpg`;
  }

  tocar(track: MusicaPlaylist): void {
    this.player.playTrack(track);
  }
}
