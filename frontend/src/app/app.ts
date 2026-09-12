import { Component, OnInit, effect, inject } from '@angular/core';
import { NavigationEnd, Router, RouterOutlet } from '@angular/router';
import { HeaderComponent } from './layout/header';
import { FooterComponent } from './layout/footer';
import { FabRsvpComponent } from './layout/fab-rsvp';
import { BgPlayerComponent } from './layout/bg-player';
import { SpiderCrawlComponent } from './layout/spider-crawl';
import { RsvpModalComponent } from './features/rsvp/rsvp-modal/rsvp-modal';
import { PartyConfigService } from './core/services/party-config.service';
import { filter, map, startWith } from 'rxjs';
import { toSignal } from '@angular/core/rxjs-interop';

@Component({
  selector: 'app-root',
  imports: [RouterOutlet, HeaderComponent, FooterComponent, FabRsvpComponent, BgPlayerComponent, SpiderCrawlComponent, RsvpModalComponent],
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

  readonly inviteMode = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.isInvite(this.router.url)),
      startWith(this.isInvite(this.router.url))
    ),
    { initialValue: this.isInvite(this.router.url) }
  );

  readonly adminMode = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map(() => this.isAdmin(this.router.url)),
      startWith(this.isAdmin(this.router.url))
    ),
    { initialValue: this.isAdmin(this.router.url) }
  );

  constructor() {
    effect(() => {
      document.body.classList.toggle('capture-mode', !!this.captureMode());
      document.body.classList.toggle('invite-mode', !!this.inviteMode());
    });
  }

  ngOnInit() {
    this.party.load().subscribe();
  }

  private isCapture(url: string) {
    return /\/festa\/[^/]+\/camera(?:[/?#]|$)/.test(url);
  }

  private isInvite(url: string) {
    return /(?:^|\/)convite(?:[/?#]|$)/.test(url);
  }

  private isAdmin(url: string) {
    return /(?:^|\/)admin(?:[/?#]|$)/.test(url);
  }
}
