import {
  Component,
  ElementRef,
  HostListener,
  OnDestroy,
  ViewChild,
  effect,
  inject,
  input,
  output,
  signal,
} from '@angular/core';
import { FormsModule } from '@angular/forms';
import { RouterLink } from '@angular/router';
import { HttpErrorResponse } from '@angular/common/http';
import { Presente, ReservaResponse } from '../../../core/models/party.models';
import { PresenteService } from '../../../core/services/presente.service';

@Component({
  selector: 'app-reserva-presente-modal',
  imports: [FormsModule, RouterLink],
  templateUrl: './reserva-presente-modal.html',
  styleUrl: './reserva-presente-modal.scss',
})
export class ReservaPresenteModalComponent implements OnDestroy {
  private readonly presenteService = inject(PresenteService);

  readonly presente = input.required<Presente>();
  readonly closed = output();
  readonly reserved = output<ReservaResponse>();
  readonly taken = output<number>();

  @ViewChild('dialog') dialogRef?: ElementRef<HTMLElement>;
  private previouslyFocused: HTMLElement | null = null;

  nome = '';
  telefone = '';
  readonly loading = signal(false);
  readonly success = signal<ReservaResponse | null>(null);
  readonly error = signal<string | null>(null);
  readonly copied = signal(false);
  readonly copyError = signal(false);

  constructor() {
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    document.body.classList.add('modal-open');
    effect(() => {
      this.presente();
      queueMicrotask(() => {
        const dialog = this.dialogRef?.nativeElement;
        const focusable = dialog?.querySelector<HTMLElement>(
          'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        (focusable ?? dialog)?.focus();
      });
    });
  }

  ngOnDestroy() {
    document.body.classList.remove('modal-open');
  }

  fechar() {
    document.body.classList.remove('modal-open');
    this.previouslyFocused?.focus?.();
    this.closed.emit();
  }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.fechar();
    }
  }

  confirmar() {
    const nomeConvidado = this.nome.trim();
    if (!nomeConvidado) {
      this.error.set('Conta pra gente o seu nome, herói!');
      return;
    }
    this.loading.set(true);
    this.error.set(null);
    this.presenteService
      .reservar(this.presente().id, {
        nomeConvidado,
        telefone: this.telefone.trim() || null,
      })
      .subscribe({
        next: (reserva) => {
          this.presenteService.lembrarReserva(reserva.presenteId, reserva.token);
          this.success.set(reserva);
          this.loading.set(false);
          this.reserved.emit(reserva);
        },
        error: (err: HttpErrorResponse) => {
          this.loading.set(false);
          if (err.status === 409) {
            this.taken.emit(this.presente().id);
            this.error.set(
              this.mensagemApi(err) ?? 'Este presente já foi escolhido por outro herói!'
            );
            return;
          }
          if (err.status === 404) {
            this.error.set('Não encontramos este presente agora.');
            return;
          }
          this.error.set(this.mensagemApi(err) ?? 'Não foi possível reservar agora. Tente de novo.');
        },
      });
  }

  linkConfirmacao(): string {
    const token = this.success()?.token;
    if (!token) {
      return '';
    }
    return `${window.location.origin}/reserva/${token}`;
  }

  copiarLink() {
    const link = this.linkConfirmacao();
    if (!link) {
      return;
    }
    this.copyError.set(false);
    if (this.copiarFallback(link)) {
      this.copied.set(true);
      return;
    }
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(link).then(
        () => this.copied.set(true),
        () => this.copyError.set(true)
      );
      return;
    }
    this.copyError.set(true);
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent) {
    if (event.key === 'Escape') {
      event.preventDefault();
      this.fechar();
      return;
    }
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  private mensagemApi(err: HttpErrorResponse): string | null {
    const body = err.error as { message?: string } | string | null;
    if (typeof body === 'string' && body.trim()) {
      return body;
    }
    if (body && typeof body === 'object' && body.message) {
      return body.message;
    }
    return null;
  }

  private copiarFallback(texto: string): boolean {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '0';
    area.style.opacity = '0';
    const host = this.dialogRef?.nativeElement ?? document.body;
    host.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, texto.length);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    host.removeChild(area);
    return ok;
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
}
