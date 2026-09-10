import { DatePipe } from '@angular/common';
import { Component, OnInit, inject, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { ReservaConsulta } from '../../core/models/party.models';
import { PresenteService } from '../../core/services/presente.service';

@Component({
  selector: 'app-reserva-page',
  imports: [RouterLink, DatePipe],
  templateUrl: './reserva-page.html',
  styleUrl: './reserva-page.scss',
})
export class ReservaPageComponent implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly presenteService = inject(PresenteService);

  readonly reserva = signal<ReservaConsulta | null>(null);
  readonly loading = signal(true);
  readonly error = signal<string | null>(null);

  ngOnInit() {
    const token = this.route.snapshot.paramMap.get('token') ?? '';
    this.presenteService.consultar(token).subscribe({
      next: (reserva) => {
        this.presenteService.lembrarReserva(reserva.presenteId, reserva.token);
        this.reserva.set(reserva);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não encontramos essa reserva. O link pode estar incompleto ou a HQ já liberou o presente de novo.');
        this.loading.set(false);
      },
    });
  }

  formatarPreco(preco: number): string {
    return new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(preco);
  }
}
