import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { Presente, PresenteTipo, ReservaResponse } from '../../core/models/party.models';
import { PresenteService } from '../../core/services/presente.service';
import { ReservaPresenteModalComponent } from './reserva-modal/reserva-presente-modal';

type TipoFiltro = 'TODOS' | PresenteTipo;
type DisponibilidadeFiltro = 'TODOS' | 'DISPONIVEL' | 'INDISPONIVEL';

@Component({
  selector: 'app-presentes-lista',
  imports: [ReservaPresenteModalComponent, RouterLink],
  templateUrl: './presentes-lista.html',
  styleUrl: './presentes-lista.scss',
})
export class PresentesListaComponent implements OnInit {
  private readonly presenteService = inject(PresenteService);

  readonly tiposFiltro: { id: TipoFiltro; label: string }[] = [
    { id: 'TODOS', label: 'Todos' },
    { id: 'BRINQUEDO', label: 'Brinquedo' },
    { id: 'ROUPA', label: 'Roupa' },
    { id: 'SAPATOS', label: 'Sapatos' },
  ];
  readonly disponibilidadesFiltro: { id: DisponibilidadeFiltro; label: string }[] = [
    { id: 'TODOS', label: 'Todos' },
    { id: 'DISPONIVEL', label: 'Disponível' },
    { id: 'INDISPONIVEL', label: 'Indisponível' },
  ];

  readonly presentes = signal<Presente[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);
  readonly selecionado = signal<Presente | null>(null);
  readonly minhasReservas = signal<Record<number, string>>({});

  readonly tipoFiltro = signal<TipoFiltro>('TODOS');
  readonly disponibilidadeFiltro = signal<DisponibilidadeFiltro>('TODOS');
  readonly precoMin = signal('');
  readonly precoMax = signal('');

  readonly presentesFiltrados = computed(() => {
    const tipo = this.tipoFiltro();
    const situacao = this.disponibilidadeFiltro();
    const minimo = parsePrecoFiltro(this.precoMin());
    const maximo = parsePrecoFiltro(this.precoMax());
    const temFaixaPreco = minimo != null || maximo != null;
    const piso = minimo ?? Number.NEGATIVE_INFINITY;
    const teto = maximo ?? Number.POSITIVE_INFINITY;
    const [de, ate] = piso <= teto ? [piso, teto] : [teto, piso];

    return this.presentes().filter((item) => {
      if (tipo !== 'TODOS' && item.tipo !== tipo) {
        return false;
      }
      if (situacao === 'DISPONIVEL' && item.reservado) {
        return false;
      }
      if (situacao === 'INDISPONIVEL' && !item.reservado) {
        return false;
      }
      if (temFaixaPreco) {
        if (item.preco == null) {
          return false;
        }
        if (item.preco < de || item.preco > ate) {
          return false;
        }
      }
      return true;
    });
  });

  readonly filtrosAtivos = computed(
    () =>
      this.tipoFiltro() !== 'TODOS' ||
      this.disponibilidadeFiltro() !== 'TODOS' ||
      parsePrecoFiltro(this.precoMin()) != null ||
      parsePrecoFiltro(this.precoMax()) != null
  );

  readonly totalOpcoes = computed(() => this.presentesFiltrados().length);
  readonly disponiveis = computed(() => this.presentesFiltrados().filter((item) => !item.reservado).length);
  readonly todosReservados = computed(
    () => !this.filtrosAtivos() && this.totalOpcoes() > 0 && this.disponiveis() === 0
  );
  readonly resumoLista = computed(() => {
    const total = this.totalOpcoes();
    const livres = this.disponiveis();
    if (total === 0) {
      return '';
    }
    if (livres === 0 && !this.filtrosAtivos()) {
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

  escolherTipo(tipo: TipoFiltro) {
    this.tipoFiltro.set(tipo);
  }

  escolherDisponibilidade(situacao: DisponibilidadeFiltro) {
    this.disponibilidadeFiltro.set(situacao);
  }

  atualizarPrecoMin(valor: string) {
    this.precoMin.set(valor);
  }

  atualizarPrecoMax(valor: string) {
    this.precoMax.set(valor);
  }

  limparFiltros() {
    this.tipoFiltro.set('TODOS');
    this.disponibilidadeFiltro.set('TODOS');
    this.precoMin.set('');
    this.precoMax.set('');
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

function parsePrecoFiltro(raw: string): number | null {
  const cleaned = raw.replace(/R\$/gi, '').replace(/\s/g, '').trim();
  if (!cleaned) {
    return null;
  }
  const normalized = cleaned.includes(',')
    ? cleaned.replace(/\./g, '').replace(',', '.')
    : cleaned;
  const valor = Number(normalized);
  if (!Number.isFinite(valor) || valor < 0) {
    return null;
  }
  return valor;
}
