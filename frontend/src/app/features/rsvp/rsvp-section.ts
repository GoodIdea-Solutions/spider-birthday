import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { RsvpService } from '../../core/services/rsvp.service';

@Component({
  selector: 'app-rsvp-section',
  imports: [ReactiveFormsModule],
  templateUrl: './rsvp-section.html',
  styleUrl: './rsvp-section.scss',
})
export class RsvpSectionComponent {
  private readonly fb = inject(FormBuilder);
  private readonly rsvpService = inject(RsvpService);

  readonly loading = signal(false);
  readonly success = signal(false);
  readonly error = signal<string | null>(null);

  readonly form = this.fb.nonNullable.group({
    nome: ['', [Validators.required, Validators.maxLength(120)]],
    quantidadeAdultos: [1, [Validators.required, Validators.min(0)]],
    quantidadeCriancas: [0, [Validators.required, Validators.min(0)]],
    telefone: [''],
  });

  submit() {
    this.error.set(null);
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      this.error.set('Preencha os dados da missão corretamente.');
      return;
    }

    const value = this.form.getRawValue();
    if (value.quantidadeAdultos + value.quantidadeCriancas < 1) {
      this.error.set('Informe ao menos 1 adulto ou 1 criança.');
      return;
    }

    this.loading.set(true);
    this.rsvpService
      .confirmar({
        nome: value.nome.trim(),
        quantidadeAdultos: value.quantidadeAdultos,
        quantidadeCriancas: value.quantidadeCriancas,
        telefone: value.telefone.trim() || null,
        nomesAdultos: [],
        nomesCriancas: [],
      })
      .subscribe({
        next: () => {
          this.loading.set(false);
          this.success.set(true);
          this.form.reset({
            nome: '',
            quantidadeAdultos: 1,
            quantidadeCriancas: 0,
            telefone: '',
          });
        },
        error: (err) => {
          this.loading.set(false);
          this.error.set(err?.error?.message || 'Falha ao confirmar. Tente de novo, herói!');
        },
      });
  }
}
