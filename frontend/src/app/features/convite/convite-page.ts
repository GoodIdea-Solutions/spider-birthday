import { Component, inject } from '@angular/core';
import { RouterLink } from '@angular/router';
import { RsvpModalService } from '../../core/services/rsvp-modal.service';

@Component({
  selector: 'app-convite-page',
  imports: [RouterLink],
  templateUrl: './convite-page.html',
  styleUrl: './convite-page.scss',
})
export class ConvitePageComponent {
  private readonly rsvpModalService = inject(RsvpModalService);

  openRsvp(): void {
    this.rsvpModalService.open();
  }
}
