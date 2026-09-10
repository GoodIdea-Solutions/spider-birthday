import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Presente, ReservaResponse } from '../../core/models/party.models';
import { PresenteService } from '../../core/services/presente.service';
import { ReservaPresenteModalComponent } from './reserva-modal/reserva-presente-modal';

@Component({
  selector: 'app-presentes-lista',
  imports: [ReservaPresenteModalComponent, RouterLink],
  templateUrl: './presentes-lista.html',
  styleUrl: './presentes-lista.scss',
})
export class PresentesListaComponent implements OnInit {
  private readonly presenteService = inject(PresenteService);

  readonly presentes = signal<Presente[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selecionado = signal<Presente | null>(null);
  readonly minhasReservas = signal<Record<number, string>>({});

  readonly totalOpcoes = computed(() => this.presentes().length);
  readonly disponiveis = computed(() => this.presentes().filter((item) => !item.reservado).length);
  readonly todosReservados = computed(() => this.totalOpcoes() > 0 && this.disponiveis() === 0);
  readonly resumoLista = computed(() => {
    const total = this.totalOpcoes();
    const livres = this.disponiveis();
    if (total === 0) {
      return '';
    }
    if (livres === 0) {
      return 'Todos os presentes já foram escolhidos ❤️';
    }
    const opcoes = total === 1 ? 'opção' : 'opções';
    const disponibilidade = livres === 1 ? 'disponível' : 'disponíveis';
    return `${total} ${opcoes} • ${livres} ${disponibilidade}`;
  });
  readonly mostrarHintScroll = computed(() => this.totalOpcoes() > 2 && this.disponiveis() > 0);

  ngOnInit() {
    this.minhasReservas.set(this.presenteService.minhasReservas());
    this.presenteService.listar().subscribe({
      next: (items) => {
        this.presentes.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar a lista de presentes agora.');
        this.loading.set(false);
      },
    });
  }

  abrirReserva(item: Presente) {
    if (item.reservado) {
      return;
    }
    this.selecionado.set(item);
  }

  fecharReserva() {
    this.selecionado.set(null);
  }

  onReservado(reserva: ReservaResponse) {
    this.minhasReservas.update((atual) => ({ ...atual, [reserva.presenteId]: reserva.token }));
    this.marcarReservado(reserva.presenteId);
  }

  onJaReservado(presenteId: number) {
    this.marcarReservado(presenteId);
  }

  ehMinhaReserva(item: Presente): boolean {
    return !!(item.reservado && this.minhasReservas()[item.id]);
  }

  formatarPreco(preco: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco);
  }

  private marcarReservado(presenteId: number) {
    this.presentes.update((lista) =>
      lista.map((item) => (item.id === presenteId ? { ...item, reservado: true } : item))
    );
  }
}
