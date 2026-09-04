import { Component, OnInit, effect, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header';
import { FooterComponent } from './layout/footer';
import { FabRsvpComponent } from './layout/fab-rsvp';
import { RsvpModalComponent } from './features/rsvp/rsvp-modal/rsvp-modal';
import { PartyConfigService } from './core/services/party-config.service';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, FabRsvpComponent, RsvpModalComponent],
  templateUrl: './app.html',
  styleUrl: './app.scss',
})
export class App implements OnInit {
  private readonly party = inject(PartyConfigService);
  private readonly router = inject(Router);

  readonly captureMode = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.isCapture(this.router.url)),
      startWith(this.isCapture(this.router.url))
    ),
    { initialValue: this.isCapture(this.router.url) }
  );

  constructor() {
    effect(() => {
      document.body.classList.toggle('capture-mode', !!this.captureMode());
    });
  }

  ngOnInit() {
    this.party.load().subscribe();
  }

  private isCapture(url: string) {
    return /\/festa\/[^/]+\/camera(?:[/?#]|$)/.test(url);
  }
}
