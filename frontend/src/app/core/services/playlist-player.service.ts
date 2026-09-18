import { Injectable, computed, effect, inject, signal, untracked } from '@angular/core';
import { MusicaPlaylist } from '../models/party.models';
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
const YT_ENDED = 0;
const YT_PLAYING = 1;
const YT_PAUSED = 2;
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

  private player: YT.Player | null = null;
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

  constructor() {
    this.clearLegacyPause();
    this.attachLifecycleResume();
    this.registerMediaSessionHandlers();
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
    }
    if (this.shuffle()) {
      this.rebuildShuffleQueue();
    }
    this.playHistory = this.playHistory.filter((item) =>
      tracks.some((track) => track.id === item.id)
    );
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
    this.clearResumeTimer();
    this.clearSkipTimer();
    this.clearReclaimTimer();
    this.stopPositionUpdates();
    this.pauseSilentMediaSessionAudio();
    this.detachUnlock();
    this.player = null;
    this.playing.set(false);
    this.syncMediaSession();
  }

  onStateChange(state: number): void {
    if (state === YT_PLAYING) {
      this.playing.set(true);
      this.endSkip();
      this.clearAutoplayTimer();
      this.registerMediaSessionHandlers();
      this.startPositionUpdates();
      this.syncMediaSession();
      this.scheduleMediaSessionReclaim();
      if (this.wantsUserPlayback()) {
        this.startSilentMediaSessionAudio();
      }
      if (this.isAudible()) {
        this.autoplayBlocked.set(false);
      }
      return;
    }
    if (state === YT_PAUSED) {
      this.playing.set(false);
      this.stopPositionUpdates();
      this.syncMediaSession();
      if (this.shouldTreatHiddenPauseAsUserPause()) {
        this.pause(true);
      }
      return;
    }
    if (state === YT_ENDED) {
      this.playing.set(false);
      this.stopPositionUpdates();
      if (this.repeat()) {
        this.restartCurrent();
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
    if (this.soundUnlocked || fromUser) {
      this.applyVolume();
    } else {
      this.player?.mute();
    }
    this.player?.playVideo();
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
    this.player?.pauseVideo();
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
    try {
      this.player?.seekTo(0, true);
      this.player?.playVideo();
    } catch {
      // Embed pode ainda não aceitar seek/play.
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
    try {
      return this.player?.getCurrentTime() ?? 0;
    } catch {
      return 0;
    }
  }

  private safeDuration(): number {
    try {
      return this.player?.getDuration() ?? 0;
    } catch {
      return 0;
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

  private wantsUserPlayback(): boolean {
    return this.playRequested && !this.userPaused && this.soundUnlocked;
  }

  private shouldTreatHiddenPauseAsUserPause(): boolean {
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
    if (!this.wantsUserPlayback() || !this.player || this.playing()) {
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
    this.setMediaAction('seekbackward', () => this.skipPrevious());
    this.setMediaAction('seekforward', () => this.skipNext());
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
    session.playbackState = this.playing() ? 'playing' : 'paused';
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
    if (!this.wantsUserPlayback() || typeof Audio === 'undefined') {
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
