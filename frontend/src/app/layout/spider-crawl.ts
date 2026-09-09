import { Component, OnDestroy, signal } from '@angular/core';

export type SpiderId = 'left' | 'right';

@Component({
  selector: 'app-spider-crawl',
  templateUrl: './spider-crawl.html',
  styleUrl: './spider-crawl.scss',
  host: {
    class: 'spider-crawl',
    'aria-hidden': 'true',
  },
})
export class SpiderCrawlComponent implements OnDestroy {
  readonly spiders = [
    { id: 'left' as const, abdomen: '#e11d2e', thorax: '#1e3a8a' },
    { id: 'right' as const, abdomen: '#1e3a8a', thorax: '#e11d2e' },
  ];

  readonly fled = signal<Record<SpiderId, boolean>>({ left: false, right: false });

  private readonly timers = new Map<SpiderId, ReturnType<typeof setTimeout>>();

  flee(id: SpiderId): void {
    if (this.fled()[id]) {
      return;
    }

    this.fled.update((state) => ({ ...state, [id]: true }));
    const previous = this.timers.get(id);
    if (previous) {
      clearTimeout(previous);
    }
    this.timers.set(
      id,
      setTimeout(() => {
        this.fled.update((state) => ({ ...state, [id]: false }));
        this.timers.delete(id);
      }, 4200)
    );
  }

  ngOnDestroy(): void {
    for (const timer of this.timers.values()) {
      clearTimeout(timer);
    }
    this.timers.clear();
  }
}
