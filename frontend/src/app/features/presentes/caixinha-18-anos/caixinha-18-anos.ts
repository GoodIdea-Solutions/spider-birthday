import { Component, computed, inject, signal } from '@angular/core';
import { PartyConfigService } from '../../../core/services/party-config.service';

@Component({
  selector: 'app-caixinha-18-anos',
  templateUrl: './caixinha-18-anos.html',
  styleUrl: './caixinha-18-anos.scss',
})
export class Caixinha18AnosComponent {
  private readonly party = inject(PartyConfigService);

  readonly copied = signal(false);
  readonly copyError = signal(false);

  readonly caixa = computed(() => this.party.caixa18Anos());
  readonly visible = computed(() => !!this.caixa().qrCodeUrl?.trim());
  readonly titulo = computed(() => this.caixa().titulo?.trim() || 'PROJETO: SAMUEL 18 ANOS');
  readonly paragrafos = computed(() =>
    (this.caixa().texto ?? '')
      .split(/\n\s*\n/)
      .map((parte) => parte.trim())
      .filter(Boolean)
  );
  readonly qrUrl = computed(() => this.caixa().qrCodeUrl?.trim() || '');
  readonly pixKey = computed(() => this.caixa().pixKey?.trim() || '');
  readonly temPix = computed(() => !!this.pixKey());

  copiarPix() {
    const chave = this.pixKey();
    if (!chave) {
      return;
    }
    this.copyError.set(false);
    if (this.copiarFallback(chave)) {
      this.copied.set(true);
      return;
    }
    if (navigator.clipboard?.writeText) {
      void navigator.clipboard.writeText(chave).then(
        () => this.copied.set(true),
        () => this.copyError.set(true)
      );
      return;
    }
    this.copyError.set(true);
  }

  private copiarFallback(texto: string): boolean {
    const area = document.createElement('textarea');
    area.value = texto;
    area.setAttribute('readonly', '');
    area.style.position = 'fixed';
    area.style.top = '0';
    area.style.left = '0';
    area.style.opacity = '0';
    document.body.appendChild(area);
    area.focus();
    area.select();
    area.setSelectionRange(0, texto.length);
    let ok = false;
    try {
      ok = document.execCommand('copy');
    } catch {
      ok = false;
    }
    document.body.removeChild(area);
    return ok;
  }
}
