import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Foto } from '../models/party.models';

@Injectable({ providedIn: 'root' })
export class FotoService {
  constructor(private readonly http: HttpClient) {}

  listarAprovadas() {
    return this.http.get<Foto[]>('/api/fotos');
  }

  listarStories() {
    return this.http.get<Foto[]>('/api/stories');
  }

  upload(file: File, tipo: 'MURAL' | 'STORY') {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Foto>(`/api/fotos?tipo=${tipo}`, form);
  }
}
