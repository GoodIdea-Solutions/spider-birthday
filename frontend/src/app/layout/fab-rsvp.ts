import { Component, inject } from '@angular/core';
import { RsvpModalService } from '../core/services/rsvp-modal.service';

@Component({
  selector: 'app-fab-rsvp',
  templateUrl: './fab-rsvp.html',
  styleUrl: './fab-rsvp.scss',
})
export class FabRsvpComponent {
  private readonly rsvpModalService = inject(RsvpModalService);

  openRsvp() {
    this.rsvpModalService.open();
  }
}
