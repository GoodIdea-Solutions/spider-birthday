import { Injectable, computed, inject, signal } from '@angular/core';
import { MusicaPlaylist } from '../models/party.models';
import { PlaylistService } from './playlist.service';

const STORAGE_KEY = 'spider-bg-music';
const VOLUME_STORAGE_KEY = 'spider-bg-volume';
const VOLUME_STEP = 10;
const VOLUME_DEFAULT = 80;
const YT_ENDED = 0;
const YT_PLAYING = 1;
const YT_PAUSED = 2;
const YT_CUED = 5;

@Injectable({ providedIn: 'root' })
export class PlaylistPlayerService {
  private readonly playlistApi = inject(PlaylistService);

  readonly tracks = signal<MusicaPlaylist[]>([]);
  readonly current = signal<MusicaPlaylist | null>(null);
  readonly playing = signal(false);
  readonly autoplayBlocked = signal(false);
  readonly loaded = signal(false);
  readonly loadError = signal(false);
  readonly volume = signal(this.readVolume());
  readonly volumeAtMin = computed(() => this.volume() <= 0);
  readonly volumeAtMax = computed(() => this.volume() >= 100);
  readonly available = computed(() => this.tracks().length > 0 && !!this.current());

  private player: YT.Player | null = null;
  private userPaused = this.readPaused();
  private playRequested = false;
  private backgroundLoop = true;
  private unlockAttached = false;
  private autoplayTimer: ReturnType<typeof setTimeout> | null = null;
  private loadingList = false;

  load(): void {
    if (this.loadingList) {
      return;
    }
    if (this.loaded() && !this.loadError()) {
      return;
    }
    this.loadingList = true;
    this.playlistApi.listar().subscribe({
      next: (tracks) => {
        this.loadingList = false;
        this.loadError.set(false);
        this.applyTracks(tracks);
      },
      error: () => {
        this.loadingList = false;
        this.loadError.set(true);
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
    this.applyVolume();
    if (this.shouldAutoplay() || this.playRequested) {
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
      return;
    }
    if (state === YT_CUED && this.shouldResumeAfterLoad()) {
      this.play(false);
    }
  }

  shouldResumeAfterLoad(): boolean {
    return this.playRequested && !this.userPaused;
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
      this.playRequested = true;
      this.writePreference('playing');
    }
    this.applyVolume();
    this.player?.playVideo();
  }

  pause(fromUser = false): void {
    if (fromUser) {
      this.userPaused = true;
      this.playRequested = false;
      this.writePreference('paused');
      this.autoplayBlocked.set(false);
    }
    this.player?.pauseVideo();
    this.playing.set(false);
  }

  playTrack(track: MusicaPlaylist): void {
    this.userPaused = false;
    this.playRequested = true;
    this.writePreference('playing');
    this.backgroundLoop = false;
    if (this.current()?.id === track.id) {
      this.play(true);
      return;
    }
    this.current.set(track);
  }

  volumeUp(): void {
    this.setVolume(this.volume() + VOLUME_STEP);
  }

  volumeDown(): void {
    this.setVolume(this.volume() - VOLUME_STEP);
  }

  setVolume(value: number): void {
    const next = this.clampVolume(value);
    this.volume.set(next);
    this.writeVolume(next);
    this.applyVolume();
  }

  isCurrent(track: MusicaPlaylist): boolean {
    return this.current()?.id === track.id;
  }

  shouldAutoplay(): boolean {
    return !this.userPaused && this.readPreference() !== 'paused';
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

  private applyVolume(): void {
    const vol = this.volume();
    try {
      this.player?.setVolume(vol);
      if (vol <= 0) {
        this.player?.mute();
      } else {
        this.player?.unMute();
      }
    } catch {
      // Player pode ainda não expor volume em alguns embeds.
    }
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
    this.playRequested = true;
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

  private clampVolume(value: number): number {
    if (!Number.isFinite(value)) {
      return VOLUME_DEFAULT;
    }
    const stepped = Math.round(value / VOLUME_STEP) * VOLUME_STEP;
    return Math.min(100, Math.max(0, stepped));
  }

  private readVolume(): number {
    try {
      const raw = sessionStorage.getItem(VOLUME_STORAGE_KEY);
      if (raw == null) {
        return VOLUME_DEFAULT;
      }
      return this.clampVolume(Number(raw));
    } catch {
      return VOLUME_DEFAULT;
    }
  }

  private writeVolume(value: number): void {
    try {
      sessionStorage.setItem(VOLUME_STORAGE_KEY, String(value));
    } catch {
      // Ignora modo privado / storage bloqueado.
    }
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
