import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Foto, FotoDestinos, FotoPage } from '../models/party.models';

@Injectable({ providedIn: 'root' })
export class FotoService {
  constructor(private readonly http: HttpClient) {}

  listarAprovadas(page = 0, size = 12) {
    return this.http.get<FotoPage>('/api/fotos', {
      params: { page: String(page), size: String(size) },
    });
  }

  listarStories() {
    return this.http.get<Foto[]>('/api/stories');
  }

  upload(file: File, destinos: FotoDestinos) {
    const form = new FormData();
    form.append('file', file);
    return this.http.post<Foto>(`/api/fotos?destinos=${destinos}`, form);
  }
}
