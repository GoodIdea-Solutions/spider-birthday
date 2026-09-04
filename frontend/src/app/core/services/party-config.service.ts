import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { PartyConfig } from '../models/party.models';

const FALLBACK_CONFIG: PartyConfig = {
  nomeCrianca: 'Samuel',
  slug: 'samuel-3-anos',
  idade: '3',
  dataFesta: '14/11/2026',
  diaSemana: 'SÁBADO',
  horario: '17h às 21h',
  local: 'Salão de Festas — Condomínio Residencial Siena',
  endereco: 'Águas Claras',
  linkGoogleMaps: 'https://maps.app.goo.gl/VsdHpbBB83hwMCYX6',
  mensagemHero: 'Venha fazer parte dessa aventura!',
  textoApresentacao:
    'O amigável da vizinhança está fazendo 3 anos e conta com você nessa missão especial!',
  mensagemFaixa: 'Prepare-se para uma mega aventura!',
  mensagemPresenca: 'Contamos com sua presença!',
  mensagemMissao: 'ACEITAR ESSA MISSÃO',
  whatsappNumber: '+351913154440',
  emailRecepcao: '[EMAIL_RECEPCAO]',
  instagramHandle: '[INSTAGRAM]',
};

@Injectable({ providedIn: 'root' })
export class PartyConfigService {
  private readonly configSignal = signal<PartyConfig | null>(null);
  readonly config = this.configSignal.asReadonly();

  constructor(private readonly http: HttpClient) {}

  load() {
    return this.http.get<PartyConfig>('/api/party').pipe(
      catchError(() => this.http.get<PartyConfig>('/assets/party-config.json')),
      tap((cfg) => this.configSignal.set(cfg)),
      catchError(() => {
        this.configSignal.set(FALLBACK_CONFIG);
        return of(FALLBACK_CONFIG);
      })
    );
  }

  slug() {
    const value = this.configSignal()?.slug?.trim();
    return value || 'samuel-3-anos';
  }
}
