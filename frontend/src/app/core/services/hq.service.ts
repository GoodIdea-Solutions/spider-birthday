import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { HqPagina } from '../models/party.models';

@Injectable({ providedIn: 'root' })
export class HqService {
  constructor(private readonly http: HttpClient) {}

  listar() {
    return this.http.get<HqPagina[]>('/api/hq');
  }
}
