import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { MusicaPlaylist } from '../models/party.models';
import { AudioElementPlayerEngine } from '../player/audio-element-player-engine';
import {
  PlayerEngine,
  PlayerEngineCallbacks,
  trackUsesDirectAudio,
} from '../player/player-engine';
import { YoutubePlayerEngine } from '../player/youtube-player-engine';
import { PlaylistService } from './playlist.service';

const STORAGE_KEY = 'spider-bg-music';
const VOLUME_STORAGE_KEY = 'spider-bg-volume';
const SHUFFLE_STORAGE_KEY = 'spider-bg-shuffle';
const REPEAT_STORAGE_KEY = 'spider-bg-repeat';
const VOLUME_STEP = 10;
const VOLUME_DEFAULT = 80;
const PREVIOUS_RESTART_SECONDS = 3;
const RESUME_DEBOUNCE_MS = 280;
const SKIP_SETTLE_MS = 1600;
const POSITION_UPDATE_MS = 1000;
const MEDIA_SESSION_RECLAIM_MS = 250;
const AUDIO_SEEK_SECONDS = 10;
const YT_PLAYING = 1;
const YT_CUED = 5;
const MEDIA_SESSION_ACTIONS: MediaSessionAction[] = [
  'play',
  'pause',
  'previoustrack',
  'nexttrack',
  'seekbackward',
  'seekforward',
];

@Injectable({ providedIn: 'root' })
export class PlaylistPlayerService {
  private readonly playlistApi = inject(PlaylistService);
  private readonly youtubeEngine = new YoutubePlayerEngine();
  private readonly audioEngine = new AudioElementPlayerEngine();

  readonly tracks = signal<MusicaPlaylist[]>([]);
  readonly current = signal<MusicaPlaylist | null>(null);
  readonly playing = signal(false);
  readonly autoplayBlocked = signal(false);
  readonly loaded = signal(false);
  readonly loadError = signal(false);
  readonly volume = signal(this.readVolume());
  readonly shuffle = signal(this.readShuffle());
  readonly repeat = signal(this.readRepeat());
  readonly volumeAtMin = computed(() => this.volume() <= 0);
  readonly volumeAtMax = computed(() => this.volume() >= 100);
  readonly available = computed(() => this.tracks().length > 0 && !!this.current());

  private activeEngine: PlayerEngine | null = null;
  private lastEngineTrackId: number | null = null;
  private userPaused = this.readPaused();
  private playRequested = false;
  private soundUnlocked = false;
  private shuffleQueue: MusicaPlaylist[] = [];
  private playHistory: MusicaPlaylist[] = [];
  private unlockAttached = false;
  private unlockAbort: AbortController | null = null;
  private autoplayTimer: ReturnType<typeof setTimeout> | null = null;
  private unmuteTimer: ReturnType<typeof setTimeout> | null = null;
  private resumeTimer: ReturnType<typeof setTimeout> | null = null;
  private skipTimer: ReturnType<typeof setTimeout> | null = null;
  private reclaimTimer: ReturnType<typeof setTimeout> | null = null;
  private positionTimer: ReturnType<typeof setInterval> | null = null;
  private loadingList = false;
  private lifecycleAttached = false;
  private skipInProgress = false;
  private silentAudio: HTMLAudioElement | null = null;
  private silentAudioUrl: string | null = null;

  private readonly engineCallbacks: PlayerEngineCallbacks = {
    playing: () => this.onEnginePlaying(),
    paused: () => this.onEnginePaused(),
    ended: () => this.onEngineEnded(),
    error: () => this.onEngineError(),
  };

  constructor() {
    this.clearLegacyPause();
    this.attachLifecycleResume();
    this.registerMediaSessionHandlers();
    effect(() => {
      const track = this.current();
      untracked(() => this.activateEngineFor(track));
    });
    effect(() => {
      this.current();
      this.playing();
      untracked(() => this.syncMediaSession(true));
    });
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
    } else {
      const updated = tracks.find((item) => item.id === current.id) ?? current;
      if (updated !== current) {
        this.current.set(updated);
      }
    }
    if (this.shuffle()) {
      this.rebuildShuffleQueue();
    }
    this.playHistory = this.playHistory.filter((item) =>
      tracks.some((track) => track.id === item.id)
    );
  }

  registerPlayer(player: YT.Player): void {
    this.youtubeEngine.attachPlayer(player);
    this.applyVolumeLevel();
    if (this.isAudioEngine()) {
      this.youtubeEngine.stop();
      return;
    }
    if (this.shouldAutoplay() || this.playRequested) {
      this.attachUnlockOnce();
      this.startMutedAutoplay();
    }
  }

  unregisterPlayer(): void {
    this.clearAutoplayTimer();
    this.clearUnmuteTimer();
    this.clearResumeTimer();
    this.clearSkipTimer();
    this.clearReclaimTimer();
    this.stopPositionUpdates();
    this.pauseSilentMediaSessionAudio();
    this.detachUnlock();
    this.youtubeEngine.detachPlayer();
    if (!this.isAudioEngine()) {
      this.playing.set(false);
      this.syncMediaSession();
    }
  }

  onStateChange(state: number): void {
    if (this.isAudioEngine()) {
      if (state === YT_PLAYING) {
        this.youtubeEngine.stop();
      }
      return;
    }
    if (state === YT_CUED && this.shouldResumeAfterLoad()) {
      this.play(false);
      return;
    }
    this.youtubeEngine.handleStateChange(state);
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
      this.markUserPlayIntent();
    }
    const engine = this.ensureEngine();
    if (engine.kind === 'audio') {
      if (!fromUser && !this.soundUnlocked) {
        return;
      }
      this.discardSilentMediaSessionAudio();
      engine.setVolume(this.volume());
      engine.play();
      this.registerMediaSessionHandlers();
      this.syncMediaSession();
      return;
    }
    if (this.soundUnlocked || fromUser) {
      this.applyVolume();
    } else {
      this.youtubeEngine.mute();
    }
    engine.play();
    if (fromUser || this.wantsUserPlayback()) {
      this.startSilentMediaSessionAudio();
      this.registerMediaSessionHandlers();
      this.syncMediaSession();
    }
  }

  pause(fromUser = false): void {
    if (fromUser) {
      this.userPaused = true;
      this.playRequested = false;
      this.writePreference('paused');
      this.autoplayBlocked.set(false);
      this.clearResumeTimer();
      this.pauseSilentMediaSessionAudio();
    }
    this.activeEngine?.pause();
    this.playing.set(false);
    this.stopPositionUpdates();
    this.syncMediaSession();
  }

  playTrack(track: MusicaPlaylist): void {
    this.beginSkip();
    this.markUserPlayIntent();
    const current = this.current();
    if (current?.id === track.id) {
      this.play(true);
      return;
    }
    this.pushHistory(current);
    this.current.set(track);
    if (this.shuffle()) {
      this.rebuildShuffleQueue();
    }
  }

  skipNext(): void {
    this.beginSkip();
    this.markUserPlayIntent();
    this.playNext();
  }

  skipPrevious(): void {
    this.beginSkip();
    this.markUserPlayIntent();
    if (this.safeCurrentTime() > PREVIOUS_RESTART_SECONDS) {
      this.restartCurrent();
      return;
    }
    this.playPrevious();
  }

  toggleRepeat(): void {
    this.setRepeat(!this.repeat());
  }

  setRepeat(enabled: boolean): void {
    this.repeat.set(enabled);
    this.writeRepeat(enabled);
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
    if (this.isAudioEngine()) {
      this.audioEngine.setVolume(next);
      return;
    }
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

  private activateEngineFor(track: MusicaPlaylist | null): void {
    const next = this.engineFor(track);
    const trackId = track?.id ?? null;
    if (this.activeEngine === next && this.lastEngineTrackId === trackId) {
      return;
    }
    const previous = this.activeEngine;
    if (previous && previous !== next) {
      this.activeEngine = next;
      previous.detach();
      previous.stop();
    } else {
      this.activeEngine = next;
    }
    next.attach(this.engineCallbacks);
    this.lastEngineTrackId = trackId;
    if (!track) {
      next.stop();
      return;
    }
    if (next.kind === 'audio') {
      this.autoplayBlocked.set(false);
      this.discardSilentMediaSessionAudio();
      next.setVolume(this.volume());
      next.load(track);
      this.registerMediaSessionHandlers();
      this.syncMediaSession();
      if (this.playRequested && !this.userPaused && this.soundUnlocked) {
        next.play();
      }
      return;
    }
    next.setVolume(this.volume());
    next.load(track);
    this.registerMediaSessionHandlers();
    this.syncMediaSession();
  }

  private engineFor(track: MusicaPlaylist | null): PlayerEngine {
    return trackUsesDirectAudio(track) ? this.audioEngine : this.youtubeEngine;
  }

  private ensureEngine(): PlayerEngine {
    const next = this.engineFor(this.current());
    if (this.activeEngine !== next) {
      this.activateEngineFor(this.current());
    }
    return this.activeEngine ?? next;
  }

  private isAudioEngine(): boolean {
    return this.activeEngine?.kind === 'audio';
  }

  private onEnginePlaying(): void {
    this.playing.set(true);
    this.endSkip();
    this.clearAutoplayTimer();
    this.registerMediaSessionHandlers();
    this.startPositionUpdates();
    this.syncMediaSession();
    this.scheduleMediaSessionReclaim();
    if (this.isAudioEngine()) {
      this.discardSilentMediaSessionAudio();
      this.autoplayBlocked.set(false);
      return;
    }
    if (this.wantsUserPlayback()) {
      this.startSilentMediaSessionAudio();
    }
    if (this.isAudible()) {
      this.autoplayBlocked.set(false);
    }
  }

  private onEnginePaused(): void {
    this.playing.set(false);
    this.stopPositionUpdates();
    this.syncMediaSession();
    if (this.isAudioEngine()) {
      return;
    }
    if (this.shouldTreatHiddenPauseAsUserPause()) {
      this.pause(true);
    }
  }

  private onEngineEnded(): void {
    this.playing.set(false);
    this.stopPositionUpdates();
    if (this.repeat()) {
      this.restartCurrent();
      return;
    }
    this.playNext();
  }

  private onEngineError(): void {
    this.playing.set(false);
    this.stopPositionUpdates();
    if (this.isAudioEngine()) {
      this.autoplayBlocked.set(true);
    }
    this.syncMediaSession();
  }

  private startMutedAutoplay(): void {
    if (this.isAudioEngine()) {
      return;
    }
    try {
      this.youtubeEngine.mute();
      this.youtubeEngine.play();
    } catch {
      // Embed pode ainda não aceitar play.
    }
    this.tryUnmuteAfterStart();
    this.watchAutoplay();
  }

  private tryUnmuteAfterStart(): void {
    this.clearUnmuteTimer();
    this.unmuteTimer = setTimeout(() => {
      if (this.userPaused || this.isAudioEngine() || !this.youtubeEngine.hasPlayer()) {
        return;
      }
      if (this.volume() <= 0) {
        this.autoplayBlocked.set(false);
        return;
      }
      try {
        this.youtubeEngine.unMute();
        this.youtubeEngine.setVolume(this.volume());
      } catch {
        // Alguns embeds atrasam a API de volume.
      }
      if (this.isAudible()) {
        this.soundUnlocked = true;
        this.autoplayBlocked.set(false);
        return;
      }
      this.youtubeEngine.mute();
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
        target.closest(
          '.music-btn.play, .music-btn.skip, .music-btn.repeat, .now-toggle, .now-skip, .now-repeat, .play-btn, .mode-btn'
        )
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
    if (this.volume() <= 0 || !this.youtubeEngine.hasPlayer()) {
      return false;
    }
    return !this.youtubeEngine.isMuted();
  }

  private applyVolume(): void {
    if (this.isAudioEngine()) {
      this.audioEngine.setVolume(this.volume());
      return;
    }
    const vol = this.volume();
    this.youtubeEngine.setVolume(vol);
    if (vol <= 0) {
      this.youtubeEngine.mute();
    } else {
      this.youtubeEngine.unMute();
    }
  }

  private applyVolumeLevel(): void {
    if (this.isAudioEngine()) {
      this.audioEngine.setVolume(this.volume());
      return;
    }
    this.youtubeEngine.setVolume(this.volume());
  }

  private playNext(): void {
    this.beginSkip();
    const tracks = this.tracks();
    const current = this.current();
    if (!tracks.length) {
      this.endSkip();
      return;
    }
    const next = this.shuffle()
      ? this.takeShuffledNext(current)
      : this.takeSequentialNext(tracks, current);
    this.applyTrackChange(current, next);
  }

  private playPrevious(): void {
    this.beginSkip();
    const tracks = this.tracks();
    const current = this.current();
    if (!tracks.length) {
      this.endSkip();
      return;
    }
    let previous: MusicaPlaylist | null = null;
    if (this.shuffle() && this.playHistory.length) {
      previous = this.playHistory.pop() ?? null;
      if (current) {
        this.shuffleQueue.unshift(current);
      }
    } else {
      previous = this.takeSequentialPrevious(tracks, current);
    }
    this.applyTrackChange(current, previous, false);
  }

  private applyTrackChange(
    current: MusicaPlaylist | null,
    next: MusicaPlaylist | null,
    recordHistory = true
  ): void {
    if (!next) {
      this.endSkip();
      return;
    }
    this.playRequested = true;
    if (next.id === current?.id) {
      this.restartCurrent();
      return;
    }
    if (recordHistory) {
      this.pushHistory(current);
    }
    this.current.set(next);
    this.registerMediaSessionHandlers();
    this.syncMediaSession();
  }

  private restartCurrent(): void {
    this.beginSkip();
    this.playRequested = true;
    const engine = this.ensureEngine();
    try {
      engine.seek(0);
      engine.play();
    } catch {
      // Embed/áudio pode ainda não aceitar seek/play.
    }
    this.registerMediaSessionHandlers();
    this.syncMediaSession();
  }

  private takeSequentialNext(
    tracks: MusicaPlaylist[],
    current: MusicaPlaylist | null
  ): MusicaPlaylist | null {
    const index = current ? tracks.findIndex((item) => item.id === current.id) : -1;
    return tracks[(index + 1) % tracks.length] ?? null;
  }

  private takeSequentialPrevious(
    tracks: MusicaPlaylist[],
    current: MusicaPlaylist | null
  ): MusicaPlaylist | null {
    const index = current ? tracks.findIndex((item) => item.id === current.id) : -1;
    if (!tracks.length) {
      return null;
    }
    const previousIndex = index <= 0 ? tracks.length - 1 : index - 1;
    return tracks[previousIndex] ?? null;
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
      if (this.userPaused || this.isAudioEngine()) {
        return;
      }
      const state = this.youtubeEngine.getPlayerState();
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

  private readRepeat(): boolean {
    try {
      return sessionStorage.getItem(REPEAT_STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  }

  private writeRepeat(enabled: boolean): void {
    try {
      sessionStorage.setItem(REPEAT_STORAGE_KEY, enabled ? '1' : '0');
    } catch {
      // Ignora modo privado / storage bloqueado.
    }
  }

  private markUserPlayIntent(): void {
    this.userPaused = false;
    this.playRequested = true;
    this.soundUnlocked = true;
    this.writePreference('playing');
    this.detachUnlock();
    this.registerMediaSessionHandlers();
    this.syncMediaSession();
  }

  private pushHistory(track: MusicaPlaylist | null): void {
    if (!track) {
      return;
    }
    const last = this.playHistory[this.playHistory.length - 1];
    if (last?.id === track.id) {
      return;
    }
    this.playHistory.push(track);
    if (this.playHistory.length > 50) {
      this.playHistory.shift();
    }
  }

  private safeCurrentTime(): number {
    return this.activeEngine?.getCurrentTime() ?? 0;
  }

  private safeDuration(): number {
    return this.activeEngine?.getDuration() ?? 0;
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

  private wantsUserPlayback(): boolean {
    return this.playRequested && !this.userPaused && this.soundUnlocked;
  }

  private shouldTreatHiddenPauseAsUserPause(): boolean {
    if (this.isAudioEngine()) {
      return false;
    }
    if (this.skipInProgress || this.isNearTrackEnd() || !this.wantsUserPlayback()) {
      return false;
    }
    return typeof document !== 'undefined' && document.hidden;
  }

  private isNearTrackEnd(): boolean {
    const duration = this.safeDuration();
    const position = this.safeCurrentTime();
    if (!duration || duration <= 0 || !Number.isFinite(position)) {
      return false;
    }
    return duration - position <= 1.5;
  }

  private beginSkip(): void {
    this.skipInProgress = true;
    this.clearSkipTimer();
    this.skipTimer = setTimeout(() => {
      this.skipInProgress = false;
      this.skipTimer = null;
    }, SKIP_SETTLE_MS);
  }

  private endSkip(): void {
    this.skipInProgress = false;
    this.clearSkipTimer();
  }

  private attachLifecycleResume(): void {
    if (this.lifecycleAttached || typeof document === 'undefined') {
      return;
    }
    this.lifecycleAttached = true;
    const resumeIfVisible = () => {
      if (typeof document !== 'undefined' && document.visibilityState !== 'visible') {
        return;
      }
      this.scheduleResumePlayback();
    };
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') {
        resumeIfVisible();
      }
    });
    window.addEventListener('pageshow', resumeIfVisible);
    document.addEventListener('resume', resumeIfVisible);
  }

  private scheduleResumePlayback(): void {
    this.clearResumeTimer();
    this.resumeTimer = setTimeout(() => {
      this.resumeTimer = null;
      this.resumeIfUserWantsPlayback();
    }, RESUME_DEBOUNCE_MS);
  }

  private resumeIfUserWantsPlayback(): void {
    if (!this.wantsUserPlayback() || this.playing()) {
      return;
    }
    if (this.isAudioEngine()) {
      this.audioEngine.play();
      return;
    }
    if (!this.youtubeEngine.hasPlayer()) {
      return;
    }
    this.play(false);
  }

  private registerMediaSessionHandlers(): void {
    if (typeof navigator === 'undefined' || !navigator.mediaSession) {
      return;
    }
    for (const action of MEDIA_SESSION_ACTIONS) {
      this.setMediaAction(action, null);
    }
    this.setMediaAction('play', () => this.play(true));
    this.setMediaAction('pause', () => this.pause(true));
    this.setMediaAction('nexttrack', () => this.skipNext());
    this.setMediaAction('previoustrack', () => this.skipPrevious());
    if (this.isAudioEngine()) {
      this.setMediaAction('seekbackward', () => this.seekAudioBy(-AUDIO_SEEK_SECONDS));
      this.setMediaAction('seekforward', () => this.seekAudioBy(AUDIO_SEEK_SECONDS));
      return;
    }
    this.setMediaAction('seekbackward', () => this.skipPrevious());
    this.setMediaAction('seekforward', () => this.skipNext());
  }

  private seekAudioBy(delta: number): void {
    if (!this.isAudioEngine()) {
      return;
    }
    this.audioEngine.seek(this.audioEngine.getCurrentTime() + delta);
    this.syncPositionState();
  }

  private setMediaAction(
    action: MediaSessionAction,
    handler: MediaSessionActionHandler | null
  ): void {
    try {
      navigator.mediaSession?.setActionHandler(action, handler);
    } catch {
      // Alguns navegadores rejeitam ações específicas.
    }
  }

  private syncMediaSession(rebindHandlers = false): void {
    if (typeof navigator === 'undefined' || !navigator.mediaSession) {
      return;
    }
    if (rebindHandlers) {
      this.registerMediaSessionHandlers();
    }
    const session = navigator.mediaSession;
    const track = this.current();
    const userStarted = this.soundUnlocked || this.playRequested;
    if (!track || !userStarted) {
      session.metadata = null;
      session.playbackState = 'none';
      this.clearPositionState();
      return;
    }
    try {
      session.metadata = new MediaMetadata({
        title: track.titulo,
        artist: track.artista || 'Playlist do Samuel',
        album: 'Playlist do Samuel',
        artwork: [
          {
            src: `https://i.ytimg.com/vi/${track.youtubeVideoId}/hqdefault.jpg`,
            sizes: '480x360',
            type: 'image/jpeg',
          },
        ],
      });
    } catch {
      // MediaMetadata pode falhar em contextos restritos.
    }
    if (this.isAudioEngine()) {
      session.playbackState = this.audioEngine.isPlaying() ? 'playing' : 'paused';
    } else {
      session.playbackState = this.playing() ? 'playing' : 'paused';
    }
    this.syncPositionState();
  }

  private syncPositionState(): void {
    if (typeof navigator === 'undefined' || !navigator.mediaSession?.setPositionState) {
      return;
    }
    const duration = this.safeDuration();
    const position = this.safeCurrentTime();
    if (!Number.isFinite(duration) || duration <= 0) {
      return;
    }
    const clamped = Number.isFinite(position) ? Math.min(Math.max(position, 0), duration) : 0;
    try {
      navigator.mediaSession.setPositionState({
        duration,
        playbackRate: 1,
        position: clamped,
      });
    } catch {
      // setPositionState rejeita valores inconsistentes em alguns navegadores.
    }
  }

  private clearPositionState(): void {
    try {
      navigator.mediaSession?.setPositionState?.(undefined);
    } catch {
      // Nem todos os navegadores aceitam limpar o estado.
    }
  }

  private startPositionUpdates(): void {
    this.stopPositionUpdates();
    this.syncPositionState();
    this.positionTimer = setInterval(() => {
      this.syncPositionState();
    }, POSITION_UPDATE_MS);
  }

  private stopPositionUpdates(): void {
    if (this.positionTimer) {
      clearInterval(this.positionTimer);
      this.positionTimer = null;
    }
  }

  private scheduleMediaSessionReclaim(): void {
    this.clearReclaimTimer();
    this.reclaimTimer = setTimeout(() => {
      this.reclaimTimer = null;
      this.registerMediaSessionHandlers();
      this.syncMediaSession();
    }, MEDIA_SESSION_RECLAIM_MS);
  }

  private startSilentMediaSessionAudio(): void {
    if (this.isAudioEngine() || !this.wantsUserPlayback() || typeof Audio === 'undefined') {
      return;
    }
    const audio = this.ensureSilentAudio();
    if (!audio) {
      return;
    }
    try {
      audio.currentTime = 0;
      const playPromise = audio.play();
      playPromise?.catch(() => {
        // Sem gesto do usuário o áudio silencioso pode ser bloqueado.
      });
    } catch {
      // Ignora falha ao reivindicar a Media Session.
    }
  }

  private pauseSilentMediaSessionAudio(): void {
    try {
      this.silentAudio?.pause();
    } catch {
      // Ignora pause em áudio já parado.
    }
  }

  private discardSilentMediaSessionAudio(): void {
    this.pauseSilentMediaSessionAudio();
    if (this.silentAudio) {
      try {
        this.silentAudio.removeAttribute('src');
        this.silentAudio.load();
      } catch {
        // Ignora limpeza em áudio já descartado.
      }
      this.silentAudio.remove();
      this.silentAudio = null;
    }
    if (this.silentAudioUrl?.startsWith('blob:')) {
      try {
        URL.revokeObjectURL(this.silentAudioUrl);
      } catch {
        // Ignora revoke em URL já inválida.
      }
    }
    this.silentAudioUrl = null;
  }

  private ensureSilentAudio(): HTMLAudioElement | null {
    if (this.silentAudio) {
      return this.silentAudio;
    }
    if (typeof document === 'undefined' || typeof Audio === 'undefined') {
      return null;
    }
    const url = this.createSilentWavUrl();
    if (!url) {
      return null;
    }
    this.silentAudioUrl = url;
    const audio = new Audio(url);
    audio.loop = true;
    audio.preload = 'auto';
    audio.volume = 0.01;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('aria-hidden', 'true');
    audio.style.position = 'absolute';
    audio.style.width = '0';
    audio.style.height = '0';
    audio.style.opacity = '0';
    audio.style.pointerEvents = 'none';
    document.body.appendChild(audio);
    this.silentAudio = audio;
    return audio;
  }

  private createSilentWavUrl(): string | null {
    try {
      const sampleRate = 8000;
      const seconds = 2;
      const dataSize = sampleRate * seconds;
      const buffer = new ArrayBuffer(44 + dataSize);
      const view = new DataView(buffer);
      const writeString = (offset: number, value: string) => {
        for (let i = 0; i < value.length; i++) {
          view.setUint8(offset + i, value.charCodeAt(i));
        }
      };
      writeString(0, 'RIFF');
      view.setUint32(4, 36 + dataSize, true);
      writeString(8, 'WAVE');
      writeString(12, 'fmt ');
      view.setUint32(16, 16, true);
      view.setUint16(20, 1, true);
      view.setUint16(22, 1, true);
      view.setUint32(24, sampleRate, true);
      view.setUint32(28, sampleRate, true);
      view.setUint16(32, 1, true);
      view.setUint16(34, 8, true);
      writeString(36, 'data');
      view.setUint32(40, dataSize, true);
      for (let i = 0; i < dataSize; i++) {
        view.setUint8(44 + i, 128);
      }
      const blob = new Blob([buffer], { type: 'audio/wav' });
      return URL.createObjectURL(blob);
    } catch {
      return 'data:audio/wav;base64,UklGRigAAABXQVZFZm10IBIAAAABAAEARKwAAIhYAQACABAAAABkYXRhAgAAAAEA';
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

  private clearResumeTimer(): void {
    if (this.resumeTimer) {
      clearTimeout(this.resumeTimer);
      this.resumeTimer = null;
    }
  }

  private clearSkipTimer(): void {
    if (this.skipTimer) {
      clearTimeout(this.skipTimer);
      this.skipTimer = null;
    }
  }

  private clearReclaimTimer(): void {
    if (this.reclaimTimer) {
      clearTimeout(this.reclaimTimer);
      this.reclaimTimer = null;
    }
  }
}
