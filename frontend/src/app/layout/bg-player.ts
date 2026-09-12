import {
  Component,
  ElementRef,
  OnDestroy,
  computed,
  effect,
  inject,
  untracked,
  viewChild,
} from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { PlaylistPlayerService } from '../core/services/playlist-player.service';
import '../core/youtube-iframe';

@Component({
  selector: 'app-bg-player',
  templateUrl: './bg-player.html',
  styleUrl: './bg-player.scss',
})
export class BgPlayerComponent implements OnDestroy {
  private readonly player = inject(PlaylistPlayerService);
  private readonly router = inject(Router);
  private readonly host = viewChild<ElementRef<HTMLElement>>('ytHost');

  private ytPlayer: YT.Player | null = null;
  private apiPromise: Promise<void> | null = null;
  private lastVideoId: string | null = null;

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  readonly current = this.player.current;
  readonly playing = this.player.playing;
  readonly autoplayBlocked = this.player.autoplayBlocked;

  readonly allowedOnRoute = computed(() => {
    const path = (this.url() ?? '').split('?')[0].split('#')[0];
    return !path.startsWith('/admin') && !/\/festa\/[^/]+\/camera(?:\/|$)/.test(path);
  });

  readonly shown = computed(
    () => this.allowedOnRoute() && this.player.tracks().length > 0 && !!this.current()
  );

  readonly inviteMode = computed(() => {
    const path = (this.url() ?? '').split('?')[0].split('#')[0];
    return /(?:^|\/)convite(?:\/|$)/.test(path);
  });

  private creating = false;

  constructor() {
    effect(() => {
      if (this.allowedOnRoute()) {
        untracked(() => this.player.load());
      }
    });

    effect(() => {
      const shown = this.shown();
      const track = this.current();
      const host = this.host();
      if (!shown || !track) {
        untracked(() => {
          if (this.ytPlayer) {
            this.destroyPlayer();
          }
        });
        return;
      }
      if (!host) {
        return;
      }
      untracked(() => void this.ensurePlayer(host.nativeElement, track.youtubeVideoId));
    });
  }

  ngOnDestroy(): void {
    this.destroyPlayer();
  }

  toggle(): void {
    this.player.toggle();
  }

  private async ensurePlayer(host: HTMLElement, videoId: string): Promise<void> {
    if (this.ytPlayer) {
      if (this.lastVideoId !== videoId) {
        this.lastVideoId = videoId;
        this.ytPlayer.loadVideoById(videoId);
      }
      return;
    }
    if (this.creating) {
      return;
    }
    this.creating = true;
    try {
      await this.loadApi();
      if (!this.shown() || !window.YT?.Player || this.ytPlayer) {
        return;
      }
      host.replaceChildren();
      const mount = document.createElement('div');
      host.appendChild(mount);
      this.lastVideoId = videoId;
      this.ytPlayer = new window.YT.Player(mount, {
        videoId,
        width: 200,
        height: 113,
        playerVars: {
          autoplay: 0,
          controls: 1,
          rel: 0,
          playsinline: 1,
          modestbranding: 1,
          origin: window.location.origin,
          enablejsapi: 1,
          fs: 0,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event) => this.player.registerPlayer(event.target),
          onStateChange: (event) => this.player.onStateChange(event.data),
        },
      });
    } finally {
      this.creating = false;
    }
  }

  private destroyPlayer(): void {
    this.player.unregisterPlayer();
    if (this.ytPlayer) {
      try {
        this.ytPlayer.destroy();
      } catch {
        // iframe já removido
      }
      this.ytPlayer = null;
    }
    this.lastVideoId = null;
  }

  private loadApi(): Promise<void> {
    if (window.YT?.Player) {
      return Promise.resolve();
    }
    if (this.apiPromise) {
      return this.apiPromise;
    }
    this.apiPromise = new Promise((resolve) => {
      const existing = document.getElementById('youtube-iframe-api');
      const prev = window.onYouTubeIframeAPIReady;
      window.onYouTubeIframeAPIReady = () => {
        prev?.();
        resolve();
      };
      if (!existing) {
        const tag = document.createElement('script');
        tag.id = 'youtube-iframe-api';
        tag.src = 'https://www.youtube.com/iframe_api';
        document.head.appendChild(tag);
      }
      if (window.YT?.Player) {
        resolve();
      }
    });
    return this.apiPromise;
  }
}
