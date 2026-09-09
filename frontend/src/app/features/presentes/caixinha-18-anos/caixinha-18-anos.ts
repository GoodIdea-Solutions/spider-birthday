import { Component, ElementRef, HostListener, OnDestroy, ViewChild, computed, inject, signal } from '@angular/core';
import { PartyConfigService } from '../../../core/services/party-config.service';

@Component({
  selector: 'app-caixinha-18-anos',
  templateUrl: './caixinha-18-anos.html',
  styleUrl: './caixinha-18-anos.scss',
})

export class Caixinha18AnosComponent implements OnDestroy {
  private readonly party = inject(PartyConfigService);

  @ViewChild('dialog') dialogRef?: ElementRef<HTMLElement>;
  private previouslyFocused: HTMLElement | null = null;

  readonly open = signal(false);
  readonly copied = signal(false);
  readonly copyError = signal(false);

  readonly caixa = computed(() => this.party.caixa18Anos());
  readonly visible = computed(() => !!this.caixa().qrCodeUrl?.trim());
  readonly titulo = computed(() => this.caixa().titulo?.trim() || 'PROJETO: SAMUEL 18 ANOS');
  readonly paragrafos = computed(() =>
    (this.caixa().texto ?? '')
      .split(/\n\s*\n/)
      .map((parte) => parte.trim())
      .filter(Boolean)
  );
  readonly qrUrl = computed(() => this.caixa().qrCodeUrl?.trim() || '');
  readonly pixKey = computed(() => this.caixa().pixKey?.trim() || '');
  readonly temPix = computed(() => !!this.pixKey());

  abrir() {
    this.copied.set(false);
    this.copyError.set(false);
    this.previouslyFocused = document.activeElement as HTMLElement | null;
    this.open.set(true);
    document.body.classList.add('modal-open');
    queueMicrotask(() => {
      const dialog = this.dialogRef?.nativeElement;
      const focusable = dialog?.querySelector<HTMLElement>(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      (focusable ?? dialog)?.focus();
    });
  }

  fechar() {
    this.open.set(false);
    this.copied.set(false);
    this.copyError.set(false);
    document.body.classList.remove('modal-open');
    this.previouslyFocused?.focus?.();
    this.previouslyFocused = null;
  }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.fechar();
    }
  }

  @HostListener('document:keydown', ['$event'])
  onDocumentKeydown(event: KeyboardEvent) {
    if (!this.open()) {
      return;
    }
    if (event.key === 'Escape') {
      event.preventDefault();
      this.fechar();
      return;
    }
    if (event.key === 'Tab') {
      this.trapFocus(event);
    }
  }

  copiarPix() {
    const chave = this.pixKey();
    if (!chave) {
      return;
    }
    this.copyError.set(false);
    if (this.copiarFallback(chave)) {
      this.copied.set(true);
      return;
    }
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(chave).then(
        () => this.copied.set(true),
        () => this.copyError.set(true)
      );
      return;
    }
    this.copyError.set(true);
  }

  ngOnDestroy() {
    if (this.open()) {
      document.body.classList.remove('modal-open');
    }
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

