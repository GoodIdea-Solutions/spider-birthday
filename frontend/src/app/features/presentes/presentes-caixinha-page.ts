import { Component, OnInit, inject } from '@angular/core';
import { Router, RouterLink } from '@angular/router';
import { PartyConfigService } from '../../core/services/party-config.service';
import { Caixinha18AnosComponent } from './caixinha-18-anos/caixinha-18-anos';

@Component({
  selector: 'app-presentes-caixinha-page',
  imports: [Caixinha18AnosComponent, RouterLink],
  template: `
    <section class="section caixinha-page">
      <div class="section-inner">
        <a class="back-link" routerLink="/presentes">Voltar aos presentes</a>
        <app-caixinha-18-anos />
      </div>
    </section>
  `,
  styles: `
    .caixinha-page {
      min-height: 80vh;
      background: linear-gradient(180deg, #f3f7ff 0%, #eef2ff 100%);
      padding-bottom: calc(8.5rem + env(safe-area-inset-bottom, 0px));
    }

    .back-link {
      display: inline-flex;
      margin-bottom: 1rem;
      color: var(--spider-blue);
      font-weight: 800;
      font-size: 0.92rem;
      text-decoration: none;
    }

    .back-link:hover {
      color: var(--spider-red);
    }

    .back-link:focus-visible {
      outline: 3px solid var(--balloon-yellow);
      outline-offset: 3px;
    }
  `,
})
export class PresentesCaixinhaPageComponent implements OnInit {
  private readonly party = inject(PartyConfigService);
  private readonly router = inject(Router);

  ngOnInit() {
    if (!this.party.caixa18Anos().qrCodeUrl?.trim()) {
      void this.router.navigateByUrl('/presentes');
    }
  }
}
