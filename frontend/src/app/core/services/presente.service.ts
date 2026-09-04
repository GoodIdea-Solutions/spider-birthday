import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Presente } from '../models/party.models';

@Injectable({ providedIn: 'root' })
export class PresenteService {
  constructor(private readonly http: HttpClient) {}

  listar() {
    return this.http.get<Presente[]>('/api/presentes');
  }
}
