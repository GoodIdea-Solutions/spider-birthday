import { Component, computed, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PartyConfigService } from '../../core/services/party-config.service';

@Component({
  selector: 'app-presentes-section',
  imports: [RouterLink],
  templateUrl: './presentes-section.html',
  styleUrl: './presentes-section.scss',
})
export class PresentesSectionComponent {
  private readonly party = inject(PartyConfigService);

  readonly temCaixinha = computed(() => !!this.party.caixa18Anos().qrCodeUrl?.trim());
}
