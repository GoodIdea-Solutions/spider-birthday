import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Dashboard, Foto, HqPagina, HqPaginaPayload, Presente, RsvpConfig, RsvpRequest, RsvpResponse } from '../models/party.models';

@Injectable({ providedIn: 'root' })
export class AdminService {
  private token = '';

  constructor(private readonly http: HttpClient) {
    this.token = localStorage.getItem('adminToken') ?? '';
  }

  setToken(token: string) {
    this.token = token;
    localStorage.setItem('adminToken', token);
  }

  getToken() {
    return this.token;
  }

  private headers() {
    return {
      headers: new HttpHeaders({
        'X-Admin-Token': this.token,
      }),
    };
  }

  dashboard() {
    return this.http.get<Dashboard>('/api/admin/dashboard', this.headers());
  }

  pendentes() {
    return this.http.get<Foto[]>('/api/admin/fotos/pendentes', this.headers());
  }

  aprovar(id: number) {
    return this.http.patch<Foto>(`/api/admin/fotos/${id}/aprovar`, {}, this.headers());
  }

  rejeitar(id: number) {
    return this.http.patch<Foto>(`/api/admin/fotos/${id}/rejeitar`, {}, this.headers());
  }

  excluir(id: number) {
    // 204 No Content — evitar parse JSON do body vazio
    return this.http.delete(`/api/admin/fotos/${id}`, {
      ...this.headers(),
      responseType: 'text',
    });
  }

  rsvps() {
    return this.http.get<RsvpResponse[]>('/api/rsvp');
  }

  excluirRsvp(id: number) {
    // 204 No Content — evitar parse JSON do body vazio
    return this.http.delete(`/api/admin/rsvp/${id}`, {
      ...this.headers(),
      responseType: 'text',
    });
  }

  atualizarRsvp(id: number, payload: RsvpRequest) {
    return this.http.put<RsvpResponse>(`/api/admin/rsvp/${id}`, payload, this.headers());
  }

  rsvpConfig() {
    return this.http.get<RsvpConfig>('/api/admin/rsvp/config', this.headers());
  }

  salvarRsvpConfig(payload: { confirmacaoLiberada: boolean; prazoConfirmacao: string | null }) {
    return this.http.put<RsvpConfig>('/api/admin/rsvp/config', payload, this.headers());
  }

  aprovadas() {
    return this.http.get<Foto[]>('/api/admin/fotos/imagens', this.headers());
  }

  todasMidias() {
    return this.http.get<Foto[]>('/api/admin/fotos', this.headers());
  }

  download(id: number) {
    return this.http.get(`/api/admin/fotos/${id}/download`, {
      ...this.headers(),
      responseType: 'blob',
    });
  }

  listarHq() {
    return this.http.get<HqPagina[]>('/api/admin/hq/paginas', this.headers());
  }

  criarHq(payload: HqPaginaPayload) {
    return this.http.post<HqPagina>('/api/admin/hq/paginas', payload, this.headers());
  }

  atualizarHq(id: number, payload: HqPaginaPayload) {
    return this.http.put<HqPagina>(`/api/admin/hq/paginas/${id}`, payload, this.headers());
  }

  excluirHq(id: number) {
    // 204 No Content — evitar parse JSON do body vazio
    return this.http.delete(`/api/admin/hq/paginas/${id}`, {
      ...this.headers(),
      responseType: 'text',
    });
  }

  listarPresentes() {
    return this.http.get<Presente[]>('/api/admin/presentes', this.headers());
  }

  salvarPresente(data: FormData, id?: number | null) {
    if (id) {
      return this.http.put<Presente>(`/api/admin/presentes/${id}`, data, this.headers());
    }
    return this.http.post<Presente>('/api/admin/presentes', data, this.headers());
  }

  excluirPresente(id: number) {
    return this.http.delete(`/api/admin/presentes/${id}`, {
      ...this.headers(),
      responseType: 'text',
    });
  }
}

