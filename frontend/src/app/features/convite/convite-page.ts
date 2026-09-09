import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PartyConfigService } from '../../core/services/party-config.service';
import { RsvpModalService } from '../../core/services/rsvp-modal.service';

@Component({
  selector: 'app-convite-page',
  imports: [RouterLink],
  templateUrl: './convite-page.html',
  styleUrl: './convite-page.scss',
})
export class ConvitePageComponent {
  private readonly rsvpModalService = inject(RsvpModalService);
  private readonly party = inject(PartyConfigService);

  readonly confirmacaoAberta = this.party.confirmacaoAberta;
  readonly textoPrazo = this.party.textoPrazo;
  readonly mensagemEncerrada = this.party.mensagemEncerrada;

  openRsvp(): void {
    this.rsvpModalService.open();
  }
}
