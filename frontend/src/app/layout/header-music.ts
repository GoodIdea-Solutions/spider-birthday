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
  readonly autoplayBlocked = this.player.autoplayBlocked;
  readonly volumeAtMin = this.player.volumeAtMin;
  readonly volumeAtMax = this.player.volumeAtMax;
  readonly repeat = this.player.repeat;
  readonly needsTap = computed(() => this.autoplayBlocked());
  readonly showPause = computed(() => this.player.playing() && !this.autoplayBlocked());

  readonly playLabel = computed(() => (this.showPause() ? 'Pausar música' : 'Tocar música'));
  readonly repeatLabel = computed(() =>
    this.repeat() ? 'Desligar repetição da música' : 'Repetir música'
  );

  toggle(): void {
    this.player.toggle();
  }

  skipNext(): void {
    this.player.skipNext();
  }

  skipPrevious(): void {
    this.player.skipPrevious();
  }

  toggleRepeat(): void {
    this.player.toggleRepeat();
  }

  volumeUp(): void {
    this.player.volumeUp();
  }

  volumeDown(): void {
    this.player.volumeDown();
  }
}
