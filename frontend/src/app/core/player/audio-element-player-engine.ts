import { MusicaPlaylist } from '../models/party.models';
import { PlayerEngine, PlayerEngineCallbacks, PlayerEngineKind } from './player-engine';

export class AudioElementPlayerEngine implements PlayerEngine {
  readonly kind: PlayerEngineKind = 'audio';

  private audio: HTMLAudioElement | null = null;
  private callbacks: PlayerEngineCallbacks | null = null;
  private loadedUrl: string | null = null;
  private ignorePause = false;

  private readonly onPlaying = () => this.callbacks?.playing();
  private readonly onPause = () => {
    const audio = this.audio;
    if (this.ignorePause || !audio || !audio.paused || !audio.getAttribute('src')) {
      return;
    }
    this.callbacks?.paused();
  };
  private readonly onEnded = () => this.callbacks?.ended();
  private readonly onError = () => this.callbacks?.error();

  attach(callbacks: PlayerEngineCallbacks): void {
    this.callbacks = callbacks;
  }

  detach(): void {
    this.callbacks = null;
  }

  load(track: MusicaPlaylist): void {
    const url = track.audioUrl?.trim();
    if (!url) {
      return;
    }
    const audio = this.ensureElement();
    if (this.loadedUrl === url && audio.src) {
      return;
    }
    this.ignorePause = true;
    audio.src = url;
    this.loadedUrl = url;
    audio.load();
    this.ignorePause = false;
  }

  play(): void {
    const audio = this.ensureElement();
    const playPromise = audio.play();
    playPromise?.catch((error) => this.callbacks?.error(error));
  }

  pause(): void {
    try {
      this.audio?.pause();
    } catch {
      // Ignora pause em áudio já parado.
    }
  }

  stop(): void {
    const audio = this.audio;
    if (!audio) {
      this.loadedUrl = null;
      return;
    }
    this.ignorePause = true;
    try {
      audio.pause();
    } catch {
      // Ignora pause em áudio já parado.
    }
    audio.removeAttribute('src');
    audio.load();
    this.loadedUrl = null;
    this.ignorePause = false;
  }

  seek(seconds: number): void {
    if (!this.audio || !Number.isFinite(seconds)) {
      return;
    }
    const duration = this.getDuration();
    const next =
      duration > 0 ? Math.min(Math.max(seconds, 0), duration) : Math.max(seconds, 0);
    try {
      this.audio.currentTime = next;
    } catch {
      // currentTime pode falhar antes dos metadados.
    }
  }

  getCurrentTime(): number {
    const time = this.audio?.currentTime;
    return Number.isFinite(time) ? (time as number) : 0;
  }

  getDuration(): number {
    const duration = this.audio?.duration;
    return Number.isFinite(duration) ? (duration as number) : 0;
  }

  setVolume(volume0to100: number): void {
    const audio = this.audio;
    if (!audio) {
      return;
    }
    const clamped = Number.isFinite(volume0to100) ? Math.min(100, Math.max(0, volume0to100)) : 0;
    audio.volume = clamped / 100;
  }

  isPlaying(): boolean {
    return !!this.audio && !this.audio.paused && !this.audio.ended;
  }

  private ensureElement(): HTMLAudioElement {
    if (this.audio) {
      return this.audio;
    }
    const audio = document.createElement('audio');
    audio.preload = 'auto';
    audio.controls = false;
    audio.playsInline = true;
    audio.setAttribute('playsinline', 'true');
    audio.setAttribute('webkit-playsinline', 'true');
    audio.setAttribute('aria-hidden', 'true');
    audio.style.position = 'absolute';
    audio.style.width = '0';
    audio.style.height = '0';
    audio.style.opacity = '0';
    audio.style.pointerEvents = 'none';
    audio.addEventListener('playing', this.onPlaying);
    audio.addEventListener('pause', this.onPause);
    audio.addEventListener('ended', this.onEnded);
    audio.addEventListener('error', this.onError);
    document.body.appendChild(audio);
    this.audio = audio;
    return audio;
  }
}
