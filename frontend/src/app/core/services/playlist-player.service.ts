import { Injectable, computed, inject, signal } from '@angular/core';
import { MusicaPlaylist } from '../models/party.models';
import { PlaylistService } from './playlist.service';

const STORAGE_KEY = 'spider-bg-music';
const VOLUME_STORAGE_KEY = 'spider-bg-volume';
const SHUFFLE_STORAGE_KEY = 'spider-bg-shuffle';
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
  readonly shuffle = signal(this.readShuffle());
  readonly volumeAtMin = computed(() => this.volume() <= 0);
  readonly volumeAtMax = computed(() => this.volume() >= 100);
  readonly available = computed(() => this.tracks().length > 0 && !!this.current());

  private player: YT.Player | null = null;
  private userPaused = this.readPaused();
  private playRequested = false;
  private soundUnlocked = false;
  private shuffleQueue: MusicaPlaylist[] = [];
  private unlockAttached = false;
  private unlockAbort: AbortController | null = null;
  private autoplayTimer: ReturnType<typeof setTimeout> | null = null;
  private unmuteTimer: ReturnType<typeof setTimeout> | null = null;
  private loadingList = false;

  constructor() {
    this.clearLegacyPause();
  }

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
    }
    if (this.shuffle()) {
      this.rebuildShuffleQueue();
    }
  }

  registerPlayer(player: YT.Player): void {
    this.player = player;
    this.applyVolumeLevel();
    if (this.shouldAutoplay() || this.playRequested) {
      this.attachUnlockOnce();
      this.startMutedAutoplay();
    }
  }

  unregisterPlayer(): void {
    this.clearAutoplayTimer();
    this.clearUnmuteTimer();
    this.detachUnlock();
    this.player = null;
    this.playing.set(false);
  }

  onStateChange(state: number): void {
    if (state === YT_PLAYING) {
      this.playing.set(true);
      this.clearAutoplayTimer();
      if (this.isAudible()) {
        this.autoplayBlocked.set(false);
      }
      return;
    }
    if (state === YT_PAUSED) {
      this.playing.set(false);
      return;
    }
    if (state === YT_ENDED) {
      this.playing.set(false);
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
    if (this.autoplayBlocked()) {
      this.play(true);
      return;
    }
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
      this.soundUnlocked = true;
      this.writePreference('playing');
      this.detachUnlock();
    }
    if (this.soundUnlocked || fromUser) {
      this.applyVolume();
    } else {
      this.player?.mute();
    }
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
    this.soundUnlocked = true;
    this.writePreference('playing');
    if (this.current()?.id === track.id) {
      this.play(true);
      return;
    }
    this.current.set(track);
    if (this.shuffle()) {
      this.rebuildShuffleQueue();
    }
  }

  toggleShuffle(): void {
    this.setShuffle(!this.shuffle());
  }

  setShuffle(enabled: boolean): void {
    this.shuffle.set(enabled);
    this.writeShuffle(enabled);
    if (enabled) {
      this.rebuildShuffleQueue();
    } else {
      this.shuffleQueue = [];
    }
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
    if (this.soundUnlocked && !this.autoplayBlocked()) {
      this.applyVolume();
    } else {
      this.applyVolumeLevel();
    }
  }

  isCurrent(track: MusicaPlaylist): boolean {
    return this.current()?.id === track.id;
  }

  shouldAutoplay(): boolean {
    return !this.userPaused && this.readPreference() !== 'paused';
  }

  private startMutedAutoplay(): void {
    try {
      this.player?.mute();
      this.player?.playVideo();
    } catch {
      // Embed pode ainda não aceitar play.
    }
    this.tryUnmuteAfterStart();
    this.watchAutoplay();
  }

  private tryUnmuteAfterStart(): void {
    this.clearUnmuteTimer();
    this.unmuteTimer = setTimeout(() => {
      if (this.userPaused || !this.player) {
        return;
      }
      if (this.volume() <= 0) {
        this.autoplayBlocked.set(false);
        return;
      }
      try {
        this.player.unMute();
        this.player.setVolume(this.volume());
      } catch {
        // Alguns embeds atrasam a API de volume.
      }
      if (this.isAudible()) {
        this.soundUnlocked = true;
        this.autoplayBlocked.set(false);
        return;
      }
      this.player.mute();
      this.autoplayBlocked.set(true);
    }, 400);
  }

  private attachUnlockOnce(): void {
    if (this.unlockAttached || typeof window === 'undefined') {
      return;
    }
    this.unlockAttached = true;
    this.unlockAbort = new AbortController();
    const options: AddEventListenerOptions = {
      capture: true,
      signal: this.unlockAbort.signal,
    };
    const unlock = (event: Event) => {
      if (this.userPaused) {
        return;
      }
      const target = event.target;
      if (
        target instanceof Element &&
        target.closest('.music-btn.play, .now-toggle, .play-btn, .mode-btn')
      ) {
        return;
      }
      this.play(true);
    };
    window.addEventListener('pointerdown', unlock, options);
    window.addEventListener('touchstart', unlock, options);
    window.addEventListener('keydown', unlock, options);
  }

  private detachUnlock(): void {
    this.unlockAbort?.abort();
    this.unlockAbort = null;
    this.unlockAttached = false;
  }

  private isAudible(): boolean {
    if (this.volume() <= 0 || !this.player) {
      return false;
    }
    try {
      return !this.player.isMuted();
    } catch {
      return false;
    }
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

  private applyVolumeLevel(): void {
    try {
      this.player?.setVolume(this.volume());
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
    const next = this.shuffle()
      ? this.takeShuffledNext(current)
      : this.takeSequentialNext(tracks, current);
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

  private takeSequentialNext(
    tracks: MusicaPlaylist[],
    current: MusicaPlaylist | null
  ): MusicaPlaylist | null {
    const index = current ? tracks.findIndex((item) => item.id === current.id) : -1;
    return tracks[(index + 1) % tracks.length] ?? null;
  }

  private takeShuffledNext(current: MusicaPlaylist | null): MusicaPlaylist | null {
    if (!this.shuffleQueue.length) {
      this.rebuildShuffleQueue(current);
    }
    return this.shuffleQueue.shift() ?? current;
  }

  private rebuildShuffleQueue(except: MusicaPlaylist | null = this.current()): void {
    const remaining = this.tracks().filter((item) => item.id !== except?.id);
    this.shuffleQueue = this.shuffleTracks(remaining);
  }

  private shuffleTracks(items: MusicaPlaylist[]): MusicaPlaylist[] {
    const next = [...items];
    for (let i = next.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [next[i], next[j]] = [next[j], next[i]];
    }
    return next;
  }

  private watchAutoplay(): void {
    this.clearAutoplayTimer();
    this.autoplayTimer = setTimeout(() => {
      const state = this.player?.getPlayerState();
      if (this.userPaused) {
        return;
      }
      if (state !== YT_PLAYING && !this.playing()) {
        this.autoplayBlocked.set(true);
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

  private readShuffle(): boolean {
    try {
      return sessionStorage.getItem(SHUFFLE_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private writeShuffle(enabled: boolean): void {
    try {
      sessionStorage.setItem(SHUFFLE_STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // Ignora modo privado / storage bloqueado.
    }
  }

  private readPaused(): boolean {
    return this.readPreference() === 'paused';
  }

  private readPreference(): string | null {
    try {
      return sessionStorage.getItem(STORAGE_KEY);
    } catch {
      return null;
    }
  }

  private writePreference(value: 'paused' | 'playing'): void {
    try {
      sessionStorage.setItem(STORAGE_KEY, value);
    } catch {
      // Ignora modo privado / storage bloqueado.
    }
  }

  private clearLegacyPause(): void {
    try {
      localStorage.removeItem(STORAGE_KEY);
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

  private clearUnmuteTimer(): void {
    if (this.unmuteTimer) {
      clearTimeout(this.unmuteTimer);
      this.unmuteTimer = null;
    }
  }
}
