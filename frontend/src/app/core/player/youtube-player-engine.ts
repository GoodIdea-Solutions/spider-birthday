import { MusicaPlaylist } from '../models/party.models';
import '../youtube-iframe';
import { PlayerEngine, PlayerEngineCallbacks, PlayerEngineKind } from './player-engine';

const YT_ENDED = 0;
const YT_PLAYING = 1;
const YT_PAUSED = 2;

export class YoutubePlayerEngine implements PlayerEngine {
  readonly kind: PlayerEngineKind = 'youtube';

  private player: YT.Player | null = null;
  private callbacks: PlayerEngineCallbacks | null = null;
  private loadedVideoId: string | null = null;

  attach(callbacks: PlayerEngineCallbacks): void {
    this.callbacks = callbacks;
  }

  detach(): void {
    this.callbacks = null;
  }

  attachPlayer(player: YT.Player): void {
    this.player = player;
  }

  detachPlayer(): void {
    this.player = null;
    this.loadedVideoId = null;
  }

  hasPlayer(): boolean {
    return this.player != null;
  }

  getPlayer(): YT.Player | null {
    return this.player;
  }

  handleStateChange(state: number): void {
    if (state === YT_PLAYING) {
      this.callbacks?.playing();
      return;
    }
    if (state === YT_PAUSED) {
      this.callbacks?.paused();
      return;
    }
    if (state === YT_ENDED) {
      this.callbacks?.ended();
    }
  }

  load(track: MusicaPlaylist): void {
    if (!this.player || !track.youtubeVideoId) {
      return;
    }
    if (this.loadedVideoId === track.youtubeVideoId) {
      return;
    }
    this.loadedVideoId = track.youtubeVideoId;
    try {
      this.player.loadVideoById(track.youtubeVideoId);
    } catch {
      this.callbacks?.error();
    }
  }

  play(): void {
    try {
      this.player?.playVideo();
    } catch {
      this.callbacks?.error();
    }
  }

  pause(): void {
    try {
      this.player?.pauseVideo();
    } catch {
      // Embed pode já ter sido pausado.
    }
  }

  stop(): void {
    if (!this.player) {
      return;
    }
    try {
      this.player.pauseVideo();
    } catch {
      // pauseVideo pode falhar se o embed ainda não estiver pronto.
    }
    try {
      this.player.stopVideo();
    } catch {
      // stopVideo pode não existir em embeds antigos; pause já foi tentado.
    }
    this.loadedVideoId = null;
  }

  seek(seconds: number): void {
    try {
      this.player?.seekTo(seconds, true);
    } catch {
      // Embed pode ainda não aceitar seek.
    }
  }

  getCurrentTime(): number {
    try {
      return this.player?.getCurrentTime() ?? 0;
    } catch {
      return 0;
    }
  }

  getDuration(): number {
    try {
      return this.player?.getDuration() ?? 0;
    } catch {
      return 0;
    }
  }

  setVolume(volume0to100: number): void {
    try {
      this.player?.setVolume(volume0to100);
    } catch {
      // Player pode ainda não expor volume em alguns embeds.
    }
  }

  mute(): void {
    try {
      this.player?.mute();
    } catch {
      // Embed pode ainda não aceitar mute.
    }
  }

  unMute(): void {
    try {
      this.player?.unMute();
    } catch {
      // Alguns embeds atrasam a API de volume.
    }
  }

  isMuted(): boolean {
    try {
      return this.player?.isMuted() ?? true;
    } catch {
      return true;
    }
  }

  getPlayerState(): number | undefined {
    try {
      return this.player?.getPlayerState();
    } catch {
      return undefined;
    }
  }
}
