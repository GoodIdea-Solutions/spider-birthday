import { Component, DestroyRef, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, computed, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import { RsvpService } from '../../../core/services/rsvp.service';
import { RsvpModalService } from '../../../core/services/rsvp-modal.service';
import { PartyConfigService } from '../../../core/services/party-config.service';

interface AdultoExtra {
  nome: string;
}

interface CriancaItem {
  nome: string;
  idade: number;
}

interface ConfirmacaoPendente {
  nome: string;
  extras: string[];
  criancas: CriancaItem[];
}

@Component({
  selector: 'app-rsvp-modal',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink],
  templateUrl: './rsvp-modal.html',
  styleUrl: './rsvp-modal.scss',
})
export class RsvpModalComponent implements OnInit, OnDestroy {
  private readonly fb = inject(FormBuilder);
  private readonly destroyRef = inject(DestroyRef);
  private readonly rsvpService = inject(RsvpService);
  private readonly partyConfig = inject(PartyConfigService);
  readonly modalService = inject(RsvpModalService);

  readonly loading = signal(false);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);
  readonly confirmacaoAberta = this.partyConfig.confirmacaoAberta;
  readonly textoPrazo = this.partyConfig.textoPrazo;
  readonly mensagemEncerrada = this.partyConfig.mensagemEncerrada;

  readonly nomeAtual = signal('');
  readonly hasNome = computed(() => this.nomeAtual().length > 0);
  readonly extras = signal<AdultoExtra[]>([]);
  readonly criancas = signal<CriancaItem[]>([]);
  readonly listaAdultos = computed(() => {
    const nome = this.nomeAtual();
    return nome ? [nome, ...this.extras().map((a) => a.nome)] : [];
  });

  readonly addingAdult = signal(false);
  readonly editingAdultIndex = signal<number | null>(null);
  readonly adultDraft = signal('');
  readonly adultFormError = signal<string | null>(null);

  readonly addingChild = signal(false);
  readonly editingChildIndex = signal<number | null>(null);
  readonly childNameDraft = signal('');
  readonly childAgeDraft = signal('');
  readonly childFormError = signal<string | null>(null);

  readonly listStatus = signal('');
  readonly pending = signal<ConfirmacaoPendente | null>(null);
  readonly whatsappFeedback = signal<string | null>(null);
  readonly whatsappError = signal<string | null>(null);

  readonly whatsappDisponivel = computed(() => {
    const raw = this.partyConfig.config()?.whatsappNumber;
    if (!raw || raw.includes('[')) {
      return false;
    }
    return this.sanitizeWhatsAppNumber(raw).length > 0;
  });

  @ViewChild('dialog') dialogRef?: ElementRef<HTMLElement>;
  private previouslyFocused: HTMLElement | null = null;

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
  });

  constructor() {
    effect(() => {
      if (this.modalService.isOpen()) {
        this.previouslyFocused = document.activeElement as HTMLElement | null;
        document.body.classList.add('modal-open');
        queueMicrotask(() => {
          const dialog = this.dialogRef?.nativeElement;
          const focusable = dialog?.querySelector<HTMLElement>(
            'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
          );
          (focusable ?? dialog)?.focus();
        });
      } else {
        document.body.classList.remove('modal-open');
        this.previouslyFocused?.focus?.();
        this.previouslyFocused = null;
      }
    });
  }

  ngOnInit() {
    this.form.controls.nome.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => this.nomeAtual.set(this.normalizarNome(value)));
  }

  ngOnDestroy() {
    document.body.classList.remove('modal-open');
  }

  close() {
    this.modalService.close();
    this.resetState();
  }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.close();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent) {
    if (!this.modalService.isOpen()) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.close();
      return;
    }
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  onAdultEnter(event: Event) {
    event.preventDefault();
    this.confirmarAdulto();
  }

  onChildEnter(event: Event) {
    event.preventDefault();
    this.confirmarCrianca();
  }

  onAdultDraftInput(event: Event) {
    this.adultDraft.set((event.target as HTMLInputElement).value);
  }

  onChildNameInput(event: Event) {
    this.childNameDraft.set((event.target as HTMLInputElement).value);
  }

  onChildAgeInput(event: Event) {
    this.childAgeDraft.set((event.target as HTMLInputElement).value);
  }

  iniciarAdicionarAdulto() {
    this.editingAdultIndex.set(null);
    this.adultDraft.set('');
    this.adultFormError.set(null);
    this.addingAdult.set(true);
    this.focarCampo('#adulto-nome-novo');
  }

  iniciarEditarAdulto(index: number) {
    const atual = this.extras()[index];
    if (!atual) {
      return;
    }
    this.addingAdult.set(false);
    this.adultFormError.set(null);
    this.adultDraft.set(atual.nome);
    this.editingAdultIndex.set(index);
    this.focarCampo(`#adulto-nome-${index}`);
  }

  cancelarAdulto() {
    this.addingAdult.set(false);
    this.editingAdultIndex.set(null);
    this.adultDraft.set('');
    this.adultFormError.set(null);
  }

  confirmarAdulto() {
    const nome = this.normalizarNome(this.adultDraft());
    const editIndex = this.editingAdultIndex();
    const erro = this.validarNomeAdulto(nome, editIndex);
    if (erro) {
      this.adultFormError.set(erro);
      return;
    }

    if (editIndex === null) {
      this.extras.update((lista) => [...lista, { nome }]);
      this.listStatus.set(`${nome} foi adicionado à lista de adultos.`);
    } else {
      this.extras.update((lista) => lista.map((item, i) => (i === editIndex ? { nome } : item)));
      this.listStatus.set(`O nome do adulto foi atualizado para ${nome}.`);
    }
    this.cancelarAdulto();
  }

  removerAdulto(index: number) {
    const removido = this.extras()[index];
    this.extras.update((lista) => lista.filter((_, i) => i !== index));
    if (this.editingAdultIndex() === index) {
      this.cancelarAdulto();
    }
    if (removido) {
      this.listStatus.set(`${removido.nome} foi removido da lista de adultos.`);
    }
  }

  iniciarAdicionarCrianca() {
    this.editingChildIndex.set(null);
    this.childNameDraft.set('');
    this.childAgeDraft.set('');
    this.childFormError.set(null);
    this.addingChild.set(true);
    this.focarCampo('#crianca-nome-novo');
  }

  iniciarEditarCrianca(index: number) {
    const atual = this.criancas()[index];
    if (!atual) {
      return;
    }
    this.addingChild.set(false);
    this.childFormError.set(null);
    this.childNameDraft.set(atual.nome);
    this.childAgeDraft.set(String(atual.idade));
    this.editingChildIndex.set(index);
    this.focarCampo(`#crianca-nome-${index}`);
  }

  cancelarCrianca() {
    this.addingChild.set(false);
    this.editingChildIndex.set(null);
    this.childNameDraft.set('');
    this.childAgeDraft.set('');
    this.childFormError.set(null);
  }

  confirmarCrianca() {
    const nome = this.normalizarNome(this.childNameDraft());
    const idade = this.parseIdade(this.childAgeDraft());
    const editIndex = this.editingChildIndex();
    const erro = this.validarCrianca(nome, idade, editIndex);
    if (erro) {
      this.childFormError.set(erro);
      return;
    }

    const item: CriancaItem = { nome, idade: idade as number };
    if (editIndex === null) {
      this.criancas.update((lista) => [...lista, item]);
      this.listStatus.set(`${nome} entrou na lista de crianças.`);
    } else {
      this.criancas.update((lista) => lista.map((c, i) => (i === editIndex ? item : c)));
      this.listStatus.set(`Os dados de ${nome} foram atualizados.`);
    }
    this.cancelarCrianca();
  }

  removerCrianca(index: number) {
    const removida = this.criancas()[index];
    this.criancas.update((lista) => lista.filter((_, i) => i !== index));
    if (this.editingChildIndex() === index) {
      this.cancelarCrianca();
    }
    if (removida) {
      this.listStatus.set(`${removida.nome} saiu da lista de crianças.`);
    }
  }

  formatarIdade(idade: number): string {
    return `${idade} ${idade === 1 ? 'ano' : 'anos'}`;
  }

  submit() {
    this.error.set(null);
    if (!this.confirmacaoAberta()) {
      this.error.set(this.mensagemEncerrada());
      return;
    }

    this.form.markAllAsTouched();
    if (!this.finalizarRascunhos()) {
      this.error.set('Confira os nomes que você estava adicionando.');
      return;
    }

    const nome = this.nomeAtual();
    if (!nome || this.form.controls.nome.invalid) {
      this.error.set('Escreva seu nome para confirmar a presença.');
      return;
    }

    const extras = this.extras().map((a) => a.nome);
    const criancas = this.criancas();
    const nomesCriancas = criancas.map((c) => c.nome);
    const idadesCriancas = criancas.map((c) => c.idade);

    this.loading.set(true);
    this.rsvpService
      .confirmar({
        nome,
        quantidadeAdultos: 1 + extras.length,
        quantidadeCriancas: criancas.length,
        nomesAdultos: extras,
        nomesCriancas,
        idadesCriancas,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.pending.set({ nome, extras, criancas });
          this.success.set(true);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Falha ao confirmar. Tente de novo, herói!');
        },
      });
  }

  openWhatsApp() {
    this.whatsappFeedback.set(null);
    this.whatsappError.set(null);

    const dados = this.pending();
    const cfg = this.partyConfig.config();
    const rawNumber = cfg?.whatsappNumber;
    if (!dados || !rawNumber || rawNumber.includes('[')) {
      this.whatsappError.set('Não foi possível abrir o WhatsApp agora. Tente de novo em instantes.');
      return;
    }
    const number = this.sanitizeWhatsAppNumber(rawNumber);
    if (!number) {
      this.whatsappError.set('Não foi possível abrir o WhatsApp agora. Tente de novo em instantes.');
      return;
    }
    const text = this.buildWhatsAppMessage(cfg?.nomeCrianca || 'Samuel', cfg?.idade, dados);
    const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    const popup = window.open(url, '_blank');
    if (!popup) {
      this.whatsappError.set(
        'Não foi possível abrir o WhatsApp neste dispositivo. Verifique o bloqueio de pop-ups e tente novamente.'
      );
      return;
    }
    this.whatsappFeedback.set('Mensagem pronta! 💬 Agora é só enviar pelo WhatsApp.');
  }

  private finalizarRascunhos(): boolean {
    if (this.addingAdult() || this.editingAdultIndex() !== null) {
      if (!this.normalizarNome(this.adultDraft())) {
        this.cancelarAdulto();
      } else {
        this.confirmarAdulto();
        if (this.adultFormError()) {
          return false;
        }
      }
    }
    if (this.addingChild() || this.editingChildIndex() !== null) {
      if (!this.normalizarNome(this.childNameDraft()) && !this.childAgeDraft().trim()) {
        this.cancelarCrianca();
      } else {
        this.confirmarCrianca();
        if (this.childFormError()) {
          return false;
        }
      }
    }
    return true;
  }

  private validarNomeAdulto(nome: string, editIndex: number | null): string | null {
    if (!nome) {
      return 'Escreva o nome do adulto.';
    }
    if (nome.length > 120) {
      return 'O nome está um pouco longo. Tente um nome mais curto.';
    }
    const existentes = this.listaAdultos();
    const duplicado = existentes.some((atual, i) => {
      if (editIndex !== null && i === editIndex + 1) {
        return false;
      }
      return this.mesmoNome(atual, nome);
    });
    if (duplicado) {
      return 'Esse nome já está na lista de adultos.';
    }
    return null;
  }

  private validarCrianca(nome: string, idade: number | null, editIndex: number | null): string | null {
    if (!nome) {
      return 'Escreva o nome da criança.';
    }
    if (nome.length > 120) {
      return 'O nome está um pouco longo. Tente um nome mais curto.';
    }
    if (idade === null) {
      return 'Informe a idade da criança, só com números (0 a 17).';
    }
    const duplicada = this.criancas().some((atual, i) => {
      if (editIndex !== null && i === editIndex) {
        return false;
      }
      return this.mesmoNome(atual.nome, nome) && atual.idade === idade;
    });
    if (duplicada) {
      return 'Essa criança já está na lista.';
    }
    return null;
  }

  private buildWhatsAppMessage(
    nomeCrianca: string,
    idade: string | undefined,
    dados: ConfirmacaoPendente
  ): string {
    const adultos = [dados.nome, ...dados.extras].join(', ');
    const anos = this.formatarIdadeFesta(idade);
    const linhas = [
      '🕷️ HOMEM-ARANHA',
      '━━━━━━━━━━━━━━━━',
      '',
      `Olá! Confirmei presença no aniversário de ${anos} do ${nomeCrianca}!`,
      '',
      `Responsável: ${dados.nome}`,
      `Adultos: ${adultos}`,
    ];
    if (dados.criancas.length > 0) {
      const criancas = dados.criancas
        .map((c) => `${c.nome} (${this.formatarIdade(c.idade)})`)
        .join(', ');
      linhas.push(`Crianças: ${criancas}`);
    }
    linhas.push(
      '',
      `🎁 Se quiser presentear o ${nomeCrianca}, veja as sugestões ou contribua para a Caixinha dos 18 anos:`,
      this.listaPresentesUrl(),
      '',
      '━━━━━━━━━━━━━━━━',
      '🕷️ MISSÃO ACEITA!'
    );
    return linhas.join('\n');
  }

  private listaPresentesUrl(): string {
    return `${window.location.origin}/presentes`;
  }

  private formatarIdadeFesta(idade: string | undefined): string {
    const numero = Number.parseInt((idade || '3').trim(), 10);
    if (!Number.isFinite(numero) || numero <= 0) {
      return '3 anos';
    }
    return this.formatarIdade(numero);
  }

  private normalizarNome(valor: string): string {
    return valor.replace(/\s+/g, ' ').trim();
  }

  private mesmoNome(a: string, b: string): boolean {
    return a.toLocaleLowerCase('pt-BR') === b.toLocaleLowerCase('pt-BR');
  }

  private parseIdade(valor: string): number | null {
    const trimmed = valor.trim();
    if (!/^\d+$/.test(trimmed)) {
      return null;
    }
    const idade = Number(trimmed);
    if (!Number.isInteger(idade) || idade < 0 || idade > 17) {
      return null;
    }
    return idade;
  }

  private resetState() {
    this.success.set(false);
    this.error.set(null);
    this.loading.set(false);
    this.form.reset({ nome: '' });
    this.nomeAtual.set('');
    this.extras.set([]);
    this.criancas.set([]);
    this.pending.set(null);
    this.listStatus.set('');
    this.whatsappFeedback.set(null);
    this.whatsappError.set(null);
    this.cancelarAdulto();
    this.cancelarCrianca();
  }

  private trapFocus(event: KeyboardEvent) {
    const dialog = this.dialogRef?.nativeElement;
    if (!dialog) {
      return;
    }
    const focusable = Array.from(
      dialog.querySelectorAll<HTMLElement>(
        'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
      )
    ).filter((el) => !el.hasAttribute('disabled') && el.tabIndex !== -1);

    if (focusable.length === 0) {
      event.preventDefault();
      dialog.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;

    if (event.shiftKey && (active === first || !dialog.contains(active))) {
      event.preventDefault();
      last.focus();
    } else if (!event.shiftKey && active === last) {
      event.preventDefault();
      first.focus();
    }
  }

  private focarCampo(selector: string) {
    setTimeout(() => {
      this.dialogRef?.nativeElement.querySelector<HTMLElement>(selector)?.focus();
    }, 0);
  }

  private sanitizeWhatsAppNumber(value: string): string {
    return value.replace(/\D/g, '');
  }
}
