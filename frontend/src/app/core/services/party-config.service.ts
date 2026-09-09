import { Injectable, signal } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { catchError, of, tap } from 'rxjs';
import { Caixa18AnosConfig, PartyConfig } from '../models/party.models';

const FALLBACK_CAIXA_18: Caixa18AnosConfig = {
  titulo: '🕷️ PROJETO: SAMUEL 18 ANOS',
  texto:
    'Hoje o nosso pequeno herói está completando 3 anos. Mas toda grande aventura tem um próximo capítulo!\n\nSe você não souber o que presentear, ou simplesmente quiser contribuir para a futura Caixinha dos 18 anos do Samuel, também temos essa opção.\n\nÉ opcional, viu? O mais importante é ter você com a gente nessa missão! ❤️',
  qrCodeUrl: '/assets/images/qr-code-caixinha-18.png',
  pixKey: '+55 (61) 99262-8452',
};

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
  caixa18Anos: FALLBACK_CAIXA_18,
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

  caixa18Anos(): Caixa18AnosConfig {
    return this.configSignal()?.caixa18Anos ?? FALLBACK_CAIXA_18;
  }
}
