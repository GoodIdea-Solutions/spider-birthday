import { Component, computed, inject } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router } from '@angular/router';
import { filter, map, startWith } from 'rxjs';
import { RsvpModalService } from '../core/services/rsvp-modal.service';

@Component({
  selector: 'app-fab-rsvp',
  templateUrl: './fab-rsvp.html',
  styleUrl: './fab-rsvp.scss',
})
export class FabRsvpComponent {
  private readonly rsvpModalService = inject(RsvpModalService);
  private readonly router = inject(Router);

  private readonly url = toSignal(
    this.router.events.pipe(
      filter((event): event is NavigationEnd => event instanceof NavigationEnd),
      map((event) => event.urlAfterRedirects),
      startWith(this.router.url)
    ),
    { initialValue: this.router.url }
  );

  readonly visible = computed(() => {
    const path = (this.url() ?? '').split('?')[0].split('#')[0];
    if (this.rsvpModalService.isOpen() || path.startsWith('/admin')) {
      return false;
    }
    return path !== '/' && path !== '';
  });

  openRsvp() {
    this.rsvpModalService.open();
  }
}
