import { Injectable, inject, signal } from '@angular/core';
import { MusicaPlaylist } from '../models/party.models';
import { PlaylistService } from './playlist.service';

const STORAGE_KEY = 'spider-bg-music';
const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_ENDED = 0;

@Injectable({ providedIn: 'root' })
export class PlaylistPlayerService {
  private readonly playlistApi = inject(PlaylistService);

  readonly tracks = signal<MusicaPlaylist[]>([]);
  readonly current = signal<MusicaPlaylist | null>(null);
  readonly playing = signal(false);
  readonly autoplayBlocked = signal(false);
  readonly loaded = signal(false);

  private player: YT.Player | null = null;
  private userPaused = this.readPaused();
  private backgroundLoop = true;
  private unlockAttached = false;
  private autoplayTimer: ReturnType<typeof setTimeout> | null = null;
  private loadingList = false;

  load(): void {
    if (this.loadingList) {
      return;
    }
    this.loadingList = true;
    this.playlistApi.listar().subscribe({
      next: (tracks) => {
        this.loadingList = false;
        this.applyTracks(tracks);
      },
      error: () => {
        this.loadingList = false;
        this.loaded.set(true);
      },
    });
  }

  private applyTracks(tracks: MusicaPlaylist[]): void {
    this.tracks.set(tracks);
    this.loaded.set(true);
    const current = this.current();
    const stillThere = !!current && tracks.some((item) => item.id === current.id);
    if (!stillThere) {
      this.current.set(tracks[0] ?? null);
      this.backgroundLoop = true;
    }
  }

  registerPlayer(player: YT.Player): void {
    this.player = player;
    try {
      player.unMute();
      player.setVolume(80);
    } catch {
      // Player pode ainda não expor volume em alguns embeds.
    }
    if (this.shouldAutoplay()) {
      this.play(false);
      this.watchAutoplay();
    }
  }

  unregisterPlayer(): void {
    this.clearAutoplayTimer();
    this.player = null;
    this.playing.set(false);
  }

  onStateChange(state: number): void {
    if (state === YT_PLAYING) {
      this.playing.set(true);
      this.autoplayBlocked.set(false);
      this.clearAutoplayTimer();
      return;
    }
    if (state === YT_PAUSED) {
      this.playing.set(false);
      return;
    }
    if (state === YT_ENDED) {
      this.playing.set(false);
      if (this.backgroundLoop) {
        this.player?.seekTo(0, true);
        this.player?.playVideo();
        return;
      }
      this.playNext();
    }
  }

  toggle(): void {
    if (this.playing()) {
      this.pause(true);
    } else {
      this.play(true);
    }
  }

  play(fromUser = false): void {
    if (fromUser) {
      this.userPaused = false;
      this.writePreference('playing');
    }
    this.player?.unMute();
    this.player?.playVideo();
  }

  pause(fromUser = false): void {
    if (fromUser) {
      this.userPaused = true;
      this.writePreference('paused');
      this.autoplayBlocked.set(false);
    }
    this.player?.pauseVideo();
    this.playing.set(false);
  }

  playTrack(track: MusicaPlaylist): void {
    this.userPaused = false;
    this.writePreference('playing');
    this.backgroundLoop = false;
    if (this.current()?.id === track.id) {
      this.play(true);
      return;
    }
    this.current.set(track);
  }

  isCurrent(track: MusicaPlaylist): boolean {
    return this.current()?.id === track.id;
  }

  shouldAutoplay(): boolean {
    if (this.userPaused) {
      return false;
    }
    if (this.prefersReduced()) {
      return false;
    }
    return this.readPreference() !== 'paused';
  }

  attachUnlockOnce(): void {
    if (this.unlockAttached || typeof window === 'undefined') {
      return;
    }
    this.unlockAttached = true;
    const unlock = () => {
      if (this.userPaused || this.playing()) {
        return;
      }
      this.play(false);
    };
    window.addEventListener('pointerdown', unlock, { once: true, capture: true });
    window.addEventListener('keydown', unlock, { once: true, capture: true });
  }

  private playNext(): void {
    const tracks = this.tracks();
    const current = this.current();
    if (!tracks.length) {
      return;
    }
    const index = current ? tracks.findIndex((item) => item.id === current.id) : -1;
    const next = tracks[(index + 1) % tracks.length];
    if (!next) {
      return;
    }
    if (next.id === current?.id) {
      this.player?.seekTo(0, true);
      this.player?.playVideo();
      return;
    }
    this.current.set(next);
  }

  private watchAutoplay(): void {
    this.clearAutoplayTimer();
    this.autoplayTimer = setTimeout(() => {
      const state = this.player?.getPlayerState();
      if (this.playing() || this.userPaused) {
        return;
      }
      if (state !== YT_PLAYING) {
        this.autoplayBlocked.set(true);
        this.attachUnlockOnce();
      }
    }, 1600);
  }

  private prefersReduced(): boolean {
    if (typeof window === 'undefined' || !window.matchMedia) {
      return false;
    }
    return (
      window.matchMedia('(prefers-reduced-motion: reduce)').matches ||
      window.matchMedia('(prefers-reduced-data: reduce)').matches
    );
  }

  private readPaused(): boolean {
    return this.readPreference() === 'paused';
  }

  private readPreference(): string | null {
    try {
      return localStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private writePreference(value: 'paused' | 'playing'): void {
    try {
      localStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Ignora modo privado / storage bloqueado.
    }
  }

  private clearAutoplayTimer(): void {
    if (this.autoplayTimer) {
      clearTimeout(this.autoplayTimer);
      this.autoplayTimer = null;
    }
  }
}
