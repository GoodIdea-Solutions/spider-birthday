import { ViewportScroller } from '@angular/common';
import { Component, HostListener, OnDestroy, effect, inject, signal } from '@angular/core';
import { Router, RouterLink, RouterLinkActive } from '@angular/router';
import { RsvpModalService } from '../core/services/rsvp-modal.service';

@Component({
  selector: 'app-header',
  imports: [RouterLink, RouterLinkActive],
  templateUrl: './header.html',
  styleUrl: './header.scss',
})
export class HeaderComponent implements OnDestroy {
  private readonly router = inject(Router);
  private readonly viewport = inject(ViewportScroller);
  private readonly rsvpModal = inject(RsvpModalService);

  readonly menuOpen = signal(false);

  constructor() {
    effect(() => {
      document.body.classList.toggle('nav-locked', this.menuOpen());
    });
  }

  toggleMenu(): void {
    this.menuOpen.update((open) => !open);
  }

  closeMenu(): void {
    this.menuOpen.set(false);
  }

  ngOnDestroy(): void {
    document.body.classList.remove('nav-locked');
  }

  openRsvp(): void {
    this.closeMenu();
    this.rsvpModal.open();
  }

  onFragmentClick(event: MouseEvent, fragment: string): void {
    this.closeMenu();
    const path = this.router.url.split('?')[0].split('#')[0];
    if (path === '/' || path === '') {
      event.preventDefault();
      requestAnimationFrame(() => this.viewport.scrollToAnchor(fragment));
    }
  }

  @HostListener('document:keydown.escape')
  onEscape(): void {
    if (this.menuOpen()) {
      this.closeMenu();
    }
  }
}
