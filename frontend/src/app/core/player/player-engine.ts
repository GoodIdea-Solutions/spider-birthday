import { MusicaPlaylist } from '../models/party.models';

export type PlayerEngineKind = 'youtube' | 'audio';

export interface PlayerEngineCallbacks {
  playing(): void;
  paused(): void;
  ended(): void;
  error(error?: unknown): void;
}

export interface PlayerEngine {
  readonly kind: PlayerEngineKind;
  attach(callbacks: PlayerEngineCallbacks): void;
  detach(): void;
  load(track: MusicaPlaylist): void;
  play(): void;
  pause(): void;
  stop(): void;
  seek(seconds: number): void;
  getCurrentTime(): number;
  getDuration(): number;
  setVolume(volume0to100: number): void;
}

export function trackUsesDirectAudio(track: MusicaPlaylist | null | undefined): boolean {
  return !!track?.audioUrl?.trim();
}
