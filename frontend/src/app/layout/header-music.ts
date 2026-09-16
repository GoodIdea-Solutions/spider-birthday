import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PlaylistPlayerService } from '../core/services/playlist-player.service';

@Component({
  selector: 'app-header-music',
  imports: [RouterLink],
  templateUrl: './header-music.html',
  styleUrl: './header-music.scss',
})
export class HeaderMusicComponent {
  readonly player = inject(PlaylistPlayerService);

  readonly shown = this.player.available;
  readonly playing = this.player.playing;
  readonly autoplayBlocked = this.player.autoplayBlocked;
  readonly volumeAtMin = this.player.volumeAtMin;
  readonly volumeAtMax = this.player.volumeAtMax;
  readonly needsTap = computed(() => this.autoplayBlocked() && !this.playing());

  readonly playLabel = computed(() => (this.playing() ? 'Pausar música' : 'Tocar música'));

  toggle(): void {
    this.player.toggle();
  }

  volumeUp(): void {
    this.player.volumeUp();
  }

  volumeDown(): void {
    this.player.volumeDown();
  }
}
