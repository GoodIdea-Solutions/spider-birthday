import { Component, computed, input } from '@angular/core';

export type WebCorner = 'tl' | 'tr' | 'bl' | 'br';

const PATHS: Record<WebCorner, string> = {
  tl: 'M0 0 L90 70 M0 30 L70 90 M30 0 L95 55 M0 60 L50 100 M60 0 L100 40 M10 10 Q55 40 90 70 Q40 55 10 10 M20 5 Q60 35 85 60',
  tr: 'M200 0 L110 70 M200 30 L130 90 M170 0 L105 55 M200 60 L150 100 M140 0 L100 40 M190 10 Q145 40 110 70 Q160 55 190 10 M180 5 Q140 35 115 60',
  bl: 'M0 200 L90 130 M0 170 L70 110 M30 200 L95 145 M0 140 L50 100 M60 200 L100 160 M10 190 Q55 160 90 130 Q40 145 10 190',
  br: 'M200 200 L110 130 M200 170 L130 110 M170 200 L105 145 M200 140 L150 100 M140 200 L100 160 M190 190 Q145 160 110 130 Q160 145 190 190',
};

@Component({
  selector: 'app-web-corner',
  templateUrl: './web-corner.html',
  styleUrl: './web-corner.scss',
  host: {
    'aria-hidden': 'true',
    '[attr.data-corner]': 'corner()',
    '[style.opacity]': 'opacity() == null ? null : opacity()',
  },
})
export class WebCornerComponent {
  readonly corner = input<WebCorner>('tl');
  readonly opacity = input<number | string | null>(null);

  readonly path = computed(() => PATHS[this.corner()]);
}
