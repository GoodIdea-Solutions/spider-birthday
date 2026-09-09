import { Component, OnInit, inject, signal } from '@angular/core';
import { Presente } from '../../core/models/party.models';
import { PresenteService } from '../../core/services/presente.service';
import { Caixinha18AnosComponent } from './caixinha-18-anos/caixinha-18-anos';

@Component({
  selector: 'app-presentes-section',
  imports: [Caixinha18AnosComponent],
  templateUrl: './presentes-section.html',
  styleUrl: './presentes-section.scss',
})
export class PresentesSectionComponent implements OnInit {
  private readonly presenteService = inject(PresenteService);

  readonly presentes = signal<Presente[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit() {
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
}
