import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RsvpService } from '../../core/services/rsvp.service';
import { PartyConfigService } from '../../core/services/party-config.service';
import { RsvpPublicResponse } from '../../core/models/party.models';

export interface CriancaDetalhe {
  nome: string;
  idade?: number;
  lembrancinha: boolean;
}

@Component({
  selector: 'app-convidados',
  standalone: true,
  templateUrl: './convidados.html',
  styleUrl: './convidados.scss',
})
export class ConvidadosComponent implements OnInit {
  private readonly rsvpService = inject(RsvpService);
  private readonly partyConfig = inject(PartyConfigService);

  readonly convidados = signal<RsvpPublicResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly party = this.partyConfig.config;

  readonly totalGrupos = computed(() => this.convidados().length);

  readonly totalAdultos = computed(() =>
    this.convidados().reduce((sum, c) => sum + c.quantidadeAdultos, 0)
  );

  readonly totalCriancas = computed(() =>
    this.convidados().reduce((sum, c) => sum + c.quantidadeCriancas, 0)
  );

  readonly totalCriancasAte12 = computed(() =>
    this.convidados().reduce((sum, c) => sum + this.contarPorFaixa(c, 'ate12'), 0)
  );

  readonly totalCriancas13Mais = computed(() =>
    this.convidados().reduce((sum, c) => sum + this.contarPorFaixa(c, '13mais'), 0)
  );

  readonly totalPessoas = computed(() => this.totalAdultos() + this.totalCriancas());

  ngOnInit() {
    this.rsvpService.listarConfirmados().subscribe({
      next: (data) => {
        this.convidados.set(data);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar a lista de heróis.');
        this.loading.set(false);
      },
    });
  }

  adultosNomes(c: RsvpPublicResponse): string {
    if (c.quantidadeAdultos <= 0) {
      return '—';
    }
    return [c.nome, ...(c.nomesAdultos ?? [])].filter(Boolean).join(', ');
  }

  criancasDetalhes(c: RsvpPublicResponse): CriancaDetalhe[] {
    const nomes = c.nomesCriancas ?? [];
    const idades = c.idadesCriancas ?? [];
    return nomes.map((nome, i) => {
      const idade = this.idadeValida(idades[i]) ? idades[i] : undefined;
      return {
        nome,
        idade,
        lembrancinha: idade !== undefined && idade <= 12,
      };
    });
  }

  formatarCrianca(crianca: CriancaDetalhe): string {
    if (crianca.idade === undefined) {
      return crianca.nome;
    }
    return `${crianca.nome} (${crianca.idade} ${crianca.idade === 1 ? 'ano' : 'anos'})`;
  }

  imprimir() {
    window.print();
  }

  private contarPorFaixa(c: RsvpPublicResponse, faixa: 'ate12' | '13mais'): number {
    return (c.idadesCriancas ?? []).filter((idade) => {
      if (!this.idadeValida(idade)) {
        return false;
      }
      return faixa === 'ate12' ? idade <= 12 : idade >= 13;
    }).length;
  }

  private idadeValida(idade?: number): idade is number {
    return idade !== undefined && idade !== null && !Number.isNaN(idade);
  }
}
