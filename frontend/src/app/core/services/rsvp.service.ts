import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { RsvpPublicResponse, RsvpRequest, RsvpResponse } from '../models/party.models';

@Injectable({ providedIn: 'root' })
export class RsvpService {
  constructor(private readonly http: HttpClient) {}

  confirmar(payload: RsvpRequest) {
    return this.http.post<RsvpResponse>('/api/rsvp', payload);
  }

  listar() {
    return this.http.get<RsvpResponse[]>('/api/rsvp');
  }

  listarConfirmados() {
    return this.http.get<RsvpPublicResponse[]>('/api/rsvp/confirmados');
  }
}
