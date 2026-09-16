import { Component, ElementRef, HostListener, OnDestroy, ViewChild, effect, input, output } from '@angular/core';
import { Presente } from '../../../core/models/party.models';
import { AdminPresenteFormComponent } from '../presente-form/admin-presente-form';

@Component({
  selector: 'app-admin-presente-modal',
  imports: [AdminPresenteFormComponent],
  templateUrl: './admin-presente-modal.html',
  styleUrl: './admin-presente-modal.scss',
})
export class AdminPresenteModalComponent implements OnDestroy {
  readonly presente = input.required<Presente>();
  readonly closed = output();
  readonly saved = output();

  @ViewChild('dialog') dialogRef?: ElementRef<HTMLElement>;
  private previouslyFocused: HTMLElement | null = null;

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

  onSaved() {
    document.body.classList.remove('modal-open');
    this.previouslyFocused?.focus?.();
    this.saved.emit();
  }

  onOverlayClick(event: MouseEvent) {
    if ((event.target as HTMLElement).classList.contains('modal-overlay')) {
      this.fechar();
    }
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
