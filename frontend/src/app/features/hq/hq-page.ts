import { Component, OnInit, inject, signal } from '@angular/core';
import { HqPagina } from '../../core/models/party.models';
import { HqService } from '../../core/services/hq.service';

@Component({
  selector: 'app-hq-page',
  templateUrl: './hq-page.html',
  styleUrl: './hq-page.scss',
})
export class HqPageComponent implements OnInit {
  private readonly hqService = inject(HqService);

  readonly paginas = signal<HqPagina[]>([]);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    this.hqService.listar().subscribe({
      next: (pages) => {
        this.paginas.set(pages);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('A revista ainda não pôde ser carregada.');
        this.loading.set(false);
      },
    });
  }
}
