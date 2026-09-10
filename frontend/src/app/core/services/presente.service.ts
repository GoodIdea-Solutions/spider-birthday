import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Presente, ReservaConsulta, ReservaRequest, ReservaResponse } from '../models/party.models';

const STORAGE_KEY = 'spider-reservas';

@Injectable({ providedIn: 'root' })
export class PresenteService {
  constructor(private readonly http: HttpClient) {}

  listar() {
    return this.http.get<Presente[]>('/api/presentes');
  }

  reservar(presenteId: number, payload: ReservaRequest) {
    return this.http.post<ReservaResponse>(`/api/presentes/${presenteId}/reservar`, payload);
  }

  consultar(token: string) {
    return this.http.get<ReservaConsulta>(`/api/reservas/${token}`);
  }

  minhasReservas(): Record<number, string> {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (!raw) {
        return {};
      }
      const parsed = JSON.parse(raw) as Record<string, string>;
      const map: Record<number, string> = {};
      for (const [key, token] of Object.entries(parsed)) {
        const id = Number(key);
        if (Number.isFinite(id) && typeof token === 'string') {
          map[id] = token;
        }
      }
      return map;
    } catch {
      return {};
    }
  }

  lembrarReserva(presenteId: number, token: string) {
    const atual = this.minhasReservas();
    atual[presenteId] = token;
    localStorage.setItem(STORAGE_KEY, JSON.stringify(atual));
  }

  tokenDaReserva(presenteId: number): string | null {
    return this.minhasReservas()[presenteId] ?? null;
  }
}
