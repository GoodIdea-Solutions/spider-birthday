import { Component, OnDestroy, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PartyConfigService } from '../../core/services/party-config.service';
import { RsvpModalService } from '../../core/services/rsvp-modal.service';
import { WebCornerComponent } from '../../layout/web-corner';

const MESES = [
  'janeiro',
  'fevereiro',
  'março',
  'abril',
  'maio',
  'junho',
  'julho',
  'agosto',
  'setembro',
  'outubro',
  'novembro',
  'dezembro',
];

@Component({
  selector: 'app-home',
  imports: [RouterLink, WebCornerComponent],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class HomeComponent implements OnInit, OnDestroy {
  private readonly partyService = inject(PartyConfigService);
  private readonly rsvpModalService = inject(RsvpModalService);
  private timerId: ReturnType<typeof setInterval> | null = null;

  readonly party = this.partyService.config;

  readonly destaques = [
    { title: 'Muita diversão', icon: 'star' },
    { title: 'Brincadeiras incríveis', icon: 'web' },
    { title: 'Doces e guloseimas', icon: 'candy' },
    { title: 'Surpresas especiais', icon: 'gift' },
  ] as const;

  readonly now = signal(Date.now());

  readonly mapsLink = computed(() => {
    const link = this.party()?.linkGoogleMaps;
    if (!link || link.includes('[')) {
      return null;
    }
    return link;
  });

  readonly dataPorExtenso = computed(() => {
    const raw = this.party()?.dataFesta;
    if (!raw || raw.includes('[')) {
      return '14 de novembro de 2026';
    }

    let year: number;
    let month: number;
    let day: number;
    if (raw.includes('/')) {
      const [d, m, y] = raw.split('/').map(Number);
      day = d;
      month = m;
      year = y;
    } else if (raw.includes('-')) {
      const [y, m, d] = raw.split('-').map(Number);
      day = d;
      month = m;
      year = y;
    } else {
      return raw;
    }

    const nomeMes = MESES[month - 1];
    if (!nomeMes || !day || !year) {
      return raw;
    }
    return `${day} de ${nomeMes} de ${year}`;
  });

  readonly countdown = computed(() => {
    const cfg = this.party();
    if (!cfg) {
      return { started: false, label: 'Carregando missão...', parts: null as null | CountdownParts };
    }

    const target = this.parsePartyDate(cfg.dataFesta, cfg.horario);
    if (!target) {
      return { started: false, label: 'Data da missão a confirmar', parts: null };
    }

    const diff = target.getTime() - this.now();
    if (diff <= 0) {
      return { started: true, label: 'A missão começou!', parts: null };
    }

    const days = Math.floor(diff / (1000 * 60 * 60 * 24));
    const hours = Math.floor((diff / (1000 * 60 * 60)) % 24);
    const minutes = Math.floor((diff / (1000 * 60)) % 60);
    const seconds = Math.floor((diff / 1000) % 60);
    return {
      started: false,
      label: `${days}d ${hours}h ${minutes}m ${seconds}s`,
      parts: { days, hours, minutes, seconds },
    };
  });

  ngOnInit() {
    this.timerId = setInterval(() => this.now.set(Date.now()), 1000);
  }

  ngOnDestroy() {
    if (this.timerId) {
      clearInterval(this.timerId);
    }
  }

  openRsvp() {
    this.rsvpModalService.open();
  }

  private parsePartyDate(data: string, horario: string): Date | null {
    if (!data || data.includes('[')) {
      return null;
    }

    let year: number;
    let month: number;
    let day: number;
    if (data.includes('/')) {
      const [d, m, y] = data.split('/').map(Number);
      day = d;
      month = m;
      year = y;
    } else if (data.includes('-')) {
      const [y, m, d] = data.split('-').map(Number);
      day = d;
      month = m;
      year = y;
    } else {
      return null;
    }

    let hour = 0;
    let minute = 0;
    if (horario && !horario.includes('[')) {
      const matchColon = horario.match(/(\d{1,2}):(\d{2})/);
      const matchH = horario.match(/(\d{1,2})\s*h/i);
      if (matchColon) {
        hour = Number(matchColon[1]);
        minute = Number(matchColon[2]);
      } else if (matchH) {
        hour = Number(matchH[1]);
      }
    }

    const date = new Date(year, month - 1, day, hour, minute, 0);
    return Number.isNaN(date.getTime()) ? null : date;
  }
}

interface CountdownParts {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
}
