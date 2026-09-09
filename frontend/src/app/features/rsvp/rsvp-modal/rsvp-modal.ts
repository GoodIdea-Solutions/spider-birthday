import { Component, DestroyRef, ElementRef, HostListener, OnDestroy, OnInit, ViewChild, effect, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { RouterLink } from '@angular/router';
import {
  FormArray,
  FormBuilder,
  FormControl,
  FormGroup,
  ReactiveFormsModule,
  Validators,
} from '@angular/forms';
import { RsvpService } from '../../../core/services/rsvp.service';
import { RsvpModalService } from '../../../core/services/rsvp-modal.service';
import { PartyConfigService } from '../../../core/services/party-config.service';

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
  readonly heroName = signal('');
  readonly confirmacaoAberta = this.partyConfig.confirmacaoAberta;
  readonly textoPrazo = this.partyConfig.textoPrazo;
  readonly mensagemEncerrada = this.partyConfig.mensagemEncerrada;

  @ViewChild('dialog') dialogRef?: ElementRef<HTMLElement>;
  private previouslyFocused: HTMLElement | null = null;

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    quantidadeAdultos: [1, [Validators.required, Validators.min(0)]],
    quantidadeCriancas: [0, [Validators.required, Validators.min(0)]],
    telefone: [''],
    nomesAdultos: this.fb.array<FormControl<string>>([]),
    criancas: this.fb.array<FormGroup<{
      nome: FormControl<string>;
      idade: FormControl<number | null>;
    }>>([]),
  });

  get nomesAdultos(): FormArray<FormControl<string>> {
    return this.form.controls.nomesAdultos;
  }

  get criancas() {
    return this.form.controls.criancas;
  }

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
    this.form.controls.quantidadeAdultos.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((qtd) => this.sincronizarAdultos(qtd));

    this.form.controls.quantidadeCriancas.valueChanges
      .pipe(takeUntilDestroyed(this.destroyRef))
      .subscribe((qtd) => this.sincronizarCriancas(qtd));
  }

  ngOnDestroy() {
    document.body.classList.remove('modal-open');
  }

  close() {
    this.modalService.close();
    this.success.set(false);
    this.error.set(null);
    this.form.reset({ nome: '', quantidadeAdultos: 1, quantidadeCriancas: 0, telefone: '' });
    this.sincronizarAdultos(1);
    this.sincronizarCriancas(0);
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

  submit() {
    this.error.set(null);
    if (!this.confirmacaoAberta()) {
      this.error.set(this.mensagemEncerrada());
      return;
    }
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Preencha o nome do responsável, de todos os acompanhantes e a idade de cada criança.');
      return;
    }
    const value = this.form.getRawValue();
    if (value.quantidadeAdultos + value.quantidadeCriancas < 1) {
      this.error.set('Informe ao menos 1 adulto ou 1 criança.');
      return;
    }

    const nomesAdultos = value.nomesAdultos.map((n) => n.trim()).filter(Boolean);
    const nomesCriancas = value.criancas.map((c) => c.nome.trim()).filter(Boolean);
    const idadesCriancas = value.criancas
      .map((c) => c.idade)
      .filter((idade): idade is number => idade !== null && idade !== undefined && !Number.isNaN(idade));

    const extrasEsperados = value.quantidadeAdultos > 1 ? value.quantidadeAdultos - 1 : 0;
    if (nomesAdultos.length !== extrasEsperados || nomesCriancas.length !== value.quantidadeCriancas) {
      this.error.set('Preencha o nome de cada adulto e criança.');
      this.form.markAllAsTouched();
      return;
    }
    if (idadesCriancas.length !== value.quantidadeCriancas) {
      this.error.set('Informe a idade de cada criança.');
      this.form.markAllAsTouched();
      return;
    }

    this.loading.set(true);
    const nome = value.nome.trim();
    this.rsvpService
      .confirmar({
        nome,
        quantidadeAdultos: value.quantidadeAdultos,
        quantidadeCriancas: value.quantidadeCriancas,
        telefone: value.telefone.trim() || null,
        nomesAdultos,
        nomesCriancas,
        idadesCriancas,
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set(true);
          this.heroName.set(nome);
          this.openWhatsApp(nome, value.quantidadeAdultos, nomesAdultos, nomesCriancas, idadesCriancas);
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Falha ao confirmar. Tente de novo, herói!');
        },
      });
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

  private sincronizarAdultos(quantidade: number) {
    const extras = Math.max(0, (quantidade ?? 0) - 1);
    this.ajustarFormArray(this.nomesAdultos, extras);
  }

  private sincronizarCriancas(quantidade: number) {
    const array = this.criancas;
    const tamanho = Math.max(0, quantidade ?? 0);
    while (array.length > tamanho) {
      array.removeAt(array.length - 1);
    }
    while (array.length < tamanho) {
      array.push(this.novaCrianca());
    }
  }

  private novaCrianca() {
    return this.fb.group({
      nome: this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]),
      idade: this.fb.control<number | null>(null, {
        validators: [Validators.required, Validators.min(0), Validators.max(17)],
      }),
    });
  }

  private ajustarFormArray(array: FormArray<FormControl<string>>, tamanho: number) {
    while (array.length > tamanho) {
      array.removeAt(array.length - 1);
    }
    while (array.length < tamanho) {
      array.push(this.fb.nonNullable.control('', [Validators.required, Validators.maxLength(120)]));
    }
  }

  private openWhatsApp(
    responsavel: string,
    quantidadeAdultos: number,
    nomesAdultos: string[],
    nomesCriancas: string[],
    idadesCriancas: number[]
  ) {
    const cfg = this.partyConfig.config();
    const rawNumber = cfg?.whatsappNumber;
    if (!rawNumber || rawNumber.includes('[')) {
      return;
    }
    const number = this.sanitizeWhatsAppNumber(rawNumber);
    if (!number) {
      return;
    }
    const text = this.buildWhatsAppMessage(
      cfg?.nomeCrianca || 'Samuel',
      responsavel,
      quantidadeAdultos,
      nomesAdultos,
      nomesCriancas,
      idadesCriancas
    );
    const url = `https://wa.me/${number}?text=${encodeURIComponent(text)}`;
    window.open(url, '_blank');
  }

  private buildWhatsAppMessage(
    nomeCrianca: string,
    responsavel: string,
    quantidadeAdultos: number,
    nomesAdultos: string[],
    nomesCriancas: string[],
    idadesCriancas: number[]
  ): string {
    const listaAdultos =
      quantidadeAdultos >= 1 ? [responsavel, ...nomesAdultos].join(', ') : '—';
    const listaCriancas = this.formatarListaCriancas(nomesCriancas, idadesCriancas);
    return [
      '*HOMEM-ARANHA*',
      '━━━━━━━━━━━━━━━━',
      '',
      `*Olá!* Confirmei presença na festa do ${nomeCrianca}!`,
      '',
      `*Responsável:* ${responsavel}`,
      `*Adultos:* ${listaAdultos}`,
      `*Crianças:* ${listaCriancas}`,
      '',
      '━━━━━━━━━━━━━━━━',
      '*MISSÃO ACEITA!*',
    ].join('\n');
  }

  private formatarListaCriancas(nomes: string[], idades: number[]): string {
    if (nomes.length === 0) {
      return '—';
    }
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

  private sanitizeWhatsAppNumber(value: string): string {
    return value.replace(/\D/g, '');
  }
}
