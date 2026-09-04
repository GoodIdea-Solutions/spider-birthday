import { Component, OnInit, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header';
import { FooterComponent } from './layout/footer';
import { FabRsvpComponent } from './layout/fab-rsvp';
import { RsvpModalComponent } from './features/rsvp/rsvp-modal/rsvp-modal';
import { PartyConfigService } from './core/services/party-config.service';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, FabRsvpComponent, RsvpModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly party = inject(PartyConfigService);

  ngOnInit() {
    this.party.load().subscribe();
  }
}
