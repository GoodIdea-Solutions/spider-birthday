import { Component, OnInit, inject, signal, computed } from '@angular/core';
import { RsvpService } from '../../core/services/rsvp.service';
import { RsvpPublicResponse } from '../../core/models/party.models';

@Component({
  selector: 'app-convidados',
  standalone: true,
  templateUrl: './convidados.html',
  styleUrl: './convidados.scss',
})
export class ConvidadosComponent implements OnInit {
  private readonly rsvpService = inject(RsvpService);

  readonly convidados = signal<RsvpPublicResponse[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  readonly totalGrupos = computed(() => this.convidados().length);

  readonly totalAdultos = computed(() =>
    this.convidados().reduce((sum, c) => sum + c.quantidadeAdultos, 0)
  );

  readonly totalCriancas = computed(() =>
    this.convidados().reduce((sum, c) => sum + c.quantidadeCriancas, 0)
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

  criancasNomes(c: RsvpPublicResponse): string {
    const nomes = c.nomesCriancas ?? [];
    if (!nomes.length) {
      return '—';
    }
    const idades = c.idadesCriancas ?? [];
    return nomes
      .map((nome, i) => this.formatarCrianca(nome, idades[i]))
      .join(', ');
  }

  private formatarCrianca(nome: string, idade?: number): string {
    if (idade === undefined || idade === null || Number.isNaN(idade)) {
      return nome;
    }
    return `${nome} (${idade} ${idade === 1 ? 'ano' : 'anos'})`;
  }

  imprimir() {
    window.print();
  }
}
