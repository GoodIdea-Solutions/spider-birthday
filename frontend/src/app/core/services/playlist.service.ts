import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { MusicaPlaylist } from '../models/party.models';

@Injectable({ providedIn: 'root' })
export class PlaylistService {
  constructor(private readonly http: HttpClient) {}

  listar() {
    return this.http.get<MusicaPlaylist[]>('/api/playlist');
  }
}
