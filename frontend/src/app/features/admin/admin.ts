import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Dashboard, Foto, HqLayout, HqPagina, HqPainelPayload, RsvpResponse } from '../../core/models/party.models';
import { AdminService } from '../../core/services/admin.service';
import { PartyConfigService } from '../../core/services/party-config.service';
import { QrCodeService } from '../../core/services/qr-code.service';

@Component({
  selector: 'app-admin',
  imports: [FormsModule],
  templateUrl: './admin.html',
  styleUrl: './admin.scss',
})
export class AdminComponent implements OnInit {
  private readonly admin = inject(AdminService);
  private readonly party = inject(PartyConfigService);
  private readonly qr = inject(QrCodeService);

  tokenInput = this.admin.getToken();
  readonly authenticated = signal(false);
  readonly loading = signal(false);
  readonly error = signal<string | null>(null);
  readonly dashboard = signal<Dashboard | null>(null);
  readonly pendentes = signal<Foto[]>([]);
  readonly rsvps = signal<RsvpResponse[]>([]);
  readonly aprovadas = signal<Foto[]>([]);
  readonly hqPaginas = signal<HqPagina[]>([]);
  readonly midias = signal<Foto[]>([]);
  readonly qrDataUrl = signal<string | null>(null);
  readonly cameraUrl = signal('');
  readonly editingId = signal<number | null>(null);
  readonly editingHqId = signal<number | null>(null);

  editNome = '';
  editAdultos = 0;
  editCriancas = 0;
  editTelefone = '';
  /** Nomes extras separados por " | " */
  editNomesAdultos = '';
  /** Nomes das crianças separados por " | " */
  editNomesCriancas = '';

  hqOrdem = 0;
  hqLayout: HqLayout = 'FULL';
  hqTitulo = '';
  hqPaineis: HqPainelPayload[] = [{ fotoId: 0, posicao: 1, legenda: '' }];

  ngOnInit() {
    if (this.tokenInput) {
      this.entrar();
    }
  }

  entrar() {
    this.admin.setToken(this.tokenInput.trim());
    this.loading.set(true);
    this.error.set(null);
    this.admin.dashboard().subscribe({
      next: (dash) => {
        this.dashboard.set(dash);
        this.authenticated.set(true);
        this.refreshLists();
        this.montarQr();
      },
      error: () => {
        this.loading.set(false);
        this.authenticated.set(false);
        this.error.set('Token inválido. Verifique o X-Admin-Token / APP_ADMIN_TOKEN.');
      },
    });
  }

  refreshLists() {
    this.admin.pendentes().subscribe({
      next: (fotos) => this.pendentes.set(fotos),
      error: () => this.error.set('Falha ao carregar fotos pendentes.'),
    });
    this.admin.rsvps().subscribe({
      next: (list) => {
        this.rsvps.set(list);
        this.loading.set(false);
      },
      error: () => {
        this.loading.set(false);
        this.error.set('Falha ao carregar RSVPs.');
      },
    });
    this.admin.aprovadas().subscribe({
      next: (fotos) => this.aprovadas.set(fotos),
      error: () => this.error.set('Falha ao carregar fotos aprovadas.'),
    });
    this.admin.listarHq().subscribe({
      next: (pages) => this.hqPaginas.set(pages),
      error: () => this.error.set('Falha ao carregar a revista HQ.'),
    });
    this.admin.todasMidias().subscribe({
      next: (items) => this.midias.set(items),
      error: () => this.error.set('Falha ao carregar arquivos enviados.'),
    });
  }

  refreshDashboard() {
    this.admin.dashboard().subscribe({
      next: (dash) => this.dashboard.set(dash),
      error: () => this.error.set('Falha ao atualizar o painel.'),
    });
  }

  aprovar(id: number) {
    this.admin.aprovar(id).subscribe({
      next: () => {
        this.pendentes.update((list) => list.filter((f) => f.id !== id));
        const dash = this.dashboard();
        if (dash) {
          this.dashboard.set({
            ...dash,
            fotosPendentes: Math.max(0, dash.fotosPendentes - 1),
            fotosAprovadas: dash.fotosAprovadas + 1,
          });
        }
        this.admin.aprovadas().subscribe({ next: (fotos) => this.aprovadas.set(fotos) });
        this.admin.todasMidias().subscribe({ next: (items) => this.midias.set(items) });
        this.refreshDashboard();
      },
      error: () => this.error.set('Não foi possível aprovar a foto.'),
    });
  }

  rejeitar(id: number) {
    this.admin.rejeitar(id).subscribe({
      next: () => {
        this.pendentes.update((list) => list.filter((f) => f.id !== id));
        this.admin.todasMidias().subscribe({ next: (items) => this.midias.set(items) });
        this.refreshDashboard();
      },
      error: () => this.error.set('Não foi possível rejeitar a mídia.'),
    });
  }

  excluir(id: number) {
    this.admin.excluir(id).subscribe({
      next: () => {
        this.error.set(null);
        this.pendentes.update((list) => list.filter((f) => f.id !== id));
        this.midias.update((list) => list.filter((f) => f.id !== id));
        this.aprovadas.update((list) => list.filter((f) => f.id !== id));
        const dash = this.dashboard();
        if (dash) {
          this.dashboard.set({
            ...dash,
            fotosPendentes: Math.max(0, dash.fotosPendentes - 1),
          });
        }
      },
      error: (err) =>
        this.error.set(this.mensagemErro(err, 'Não foi possível excluir a foto.')),
    });
  }

  formatarNomes(nomes: string[] | null | undefined): string {
    if (!nomes || nomes.length === 0) {
      return '—';
    }
    return nomes.join(', ');
  }

  iniciarEdicao(rsvp: RsvpResponse) {
    this.editingId.set(rsvp.id);
    this.editNome = rsvp.nome;
    this.editAdultos = rsvp.quantidadeAdultos;
    this.editCriancas = rsvp.quantidadeCriancas;
    this.editTelefone = rsvp.telefone ?? '';
    this.editNomesAdultos = (rsvp.nomesAdultos ?? []).join(' | ');
    this.editNomesCriancas = (rsvp.nomesCriancas ?? []).join(' | ');
    this.error.set(null);
  }

  cancelarEdicao() {
    this.editingId.set(null);
  }

  salvarEdicao(id: number) {
    const nome = this.editNome.trim();
    if (!nome) {
      this.error.set('Nome é obrigatório.');
      return;
    }
    if (this.editAdultos + this.editCriancas < 1) {
      this.error.set('Informe ao menos 1 adulto ou 1 criança.');
      return;
    }

    const nomesAdultos = this.parseNomes(this.editNomesAdultos);
    const nomesCriancas = this.parseNomes(this.editNomesCriancas);
    const extrasEsperados = this.editAdultos > 1 ? this.editAdultos - 1 : 0;

    if (nomesAdultos.length !== extrasEsperados) {
      this.error.set(
        extrasEsperados === 0
          ? 'Deixe "Adultos extras" vazio quando há no máximo 1 adulto.'
          : `Informe ${extrasEsperados} nome(s) de adulto(s) extra(s), separados por | .`
      );
      return;
    }
    if (nomesCriancas.length !== this.editCriancas) {
      this.error.set(
        this.editCriancas === 0
          ? 'Deixe "Crianças" vazio quando a quantidade é zero.'
          : `Informe ${this.editCriancas} nome(s) de criança(s), separados por | .`
      );
      return;
    }

    this.admin
      .atualizarRsvp(id, {
        nome,
        quantidadeAdultos: this.editAdultos,
        quantidadeCriancas: this.editCriancas,
        telefone: this.editTelefone.trim() || null,
        nomesAdultos,
        nomesCriancas,
      })
      .subscribe({
        next: (atualizado) => {
          this.rsvps.update((list) => list.map((r) => (r.id === id ? atualizado : r)));
          this.editingId.set(null);
          this.refreshDashboard();
        },
        error: (err) =>
          this.error.set(err?.error?.message || 'Não foi possível atualizar o RSVP.'),
      });
  }

  excluirRsvp(rsvp: RsvpResponse) {
    if (!confirm(`Excluir a confirmação de "${rsvp.nome}"?`)) {
      return;
    }

    this.admin.excluirRsvp(rsvp.id).subscribe({
      next: () => {
        this.error.set(null);
        this.rsvps.update((list) => list.filter((r) => r.id !== rsvp.id));
        if (this.editingId() === rsvp.id) {
          this.editingId.set(null);
        }
        this.refreshDashboard();
      },
      error: (err) =>
        this.error.set(this.mensagemErro(err, 'Não foi possível excluir o RSVP.')),
    });
  }

  private parseNomes(valor: string): string[] {
    if (!valor?.trim()) {
      return [];
    }
    return valor
      .split('|')
      .map((n) => n.trim())
      .filter(Boolean);
  }

  painelCount(layout: HqLayout): number {
    if (layout === 'DUPLO') {
      return 2;
    }
    if (layout === 'TRIPLO') {
      return 3;
    }
    return 1;
  }

  onHqLayoutChange() {
    const count = this.painelCount(this.hqLayout);
    const next: HqPainelPayload[] = [];
    for (let i = 0; i < count; i++) {
      next.push(this.hqPaineis[i] ?? { fotoId: 0, posicao: i + 1, legenda: '' });
      next[i].posicao = i + 1;
    }
    this.hqPaineis = next;
  }

  resetHqForm() {
    this.editingHqId.set(null);
    this.hqOrdem = this.hqPaginas().length;
    this.hqLayout = 'FULL';
    this.hqTitulo = '';
    this.hqPaineis = [{ fotoId: 0, posicao: 1, legenda: '' }];
  }

  iniciarEdicaoHq(pagina: HqPagina) {
    this.editingHqId.set(pagina.id);
    this.hqOrdem = pagina.ordem;
    this.hqLayout = pagina.layout;
    this.hqTitulo = pagina.titulo ?? '';
    this.hqPaineis = pagina.paineis.map((p) => ({
      fotoId: p.fotoId,
      posicao: p.posicao,
      legenda: p.legenda ?? '',
    }));
    this.onHqLayoutChange();
  }

  salvarHq() {
    const count = this.painelCount(this.hqLayout);
    if (this.hqPaineis.length !== count || this.hqPaineis.some((p) => !p.fotoId)) {
      this.error.set('Escolha uma foto aprovada para cada painel.');
      return;
    }
    const payload = {
      ordem: this.hqOrdem,
      layout: this.hqLayout,
      titulo: this.hqTitulo.trim() || null,
      paineis: this.hqPaineis.map((p, i) => ({
        fotoId: Number(p.fotoId),
        posicao: i + 1,
        legenda: p.legenda?.trim() || null,
      })),
    };
    const id = this.editingHqId();
    const req = id
      ? this.admin.atualizarHq(id, payload)
      : this.admin.criarHq(payload);
    req.subscribe({
      next: () => {
        this.error.set(null);
        this.resetHqForm();
        this.admin.listarHq().subscribe({ next: (pages) => this.hqPaginas.set(pages) });
      },
      error: (err) =>
        this.error.set(err?.error?.message || 'Não foi possível salvar a página da HQ.'),
    });
  }

  excluirHq(pagina: HqPagina) {
    if (!confirm(`Excluir a página "${pagina.titulo || '#' + pagina.id}" da revista?`)) {
      return;
    }
    this.admin.excluirHq(pagina.id).subscribe({
      next: () => {
        this.error.set(null);
        this.hqPaginas.update((list) => list.filter((p) => p.id !== pagina.id));
        if (this.editingHqId() === pagina.id) {
          this.resetHqForm();
        }
      },
      error: (err) =>
        this.error.set(this.mensagemErro(err, 'Não foi possível excluir a página da HQ.')),
    });
  }

  private mensagemErro(err: unknown, fallback: string): string {
    const raw = (err as { error?: unknown })?.error;
    if (typeof raw === 'string' && raw.trim()) {
      try {
        const parsed = JSON.parse(raw) as { message?: string };
        if (parsed?.message) {
          return parsed.message;
        }
      } catch {
        return raw;
      }
      return raw;
    }
    if (raw && typeof raw === 'object' && 'message' in raw) {
      const message = (raw as { message?: string }).message;
      if (message) {
        return message;
      }
    }
    return fallback;
  }

  rotuloMidia(foto: Foto): string {
    const dest = this.rotuloDestinos(foto);
    const kind = foto.video ? 'vídeo' : 'foto';
    const status =
      foto.status === 'REJEITADA' ? 'rejeitada' : foto.status === 'PENDENTE' ? 'pendente' : 'aprovada';
    const expired = this.storyExpirado(foto);
    return expired ? `${dest} · ${kind} · ${status} · story expirado` : `${dest} · ${kind} · ${status}`;
  }

  rotuloDestinos(foto: Foto): string {
    const destinos = foto.destinosSolicitados;
    if (destinos === 'AMBOS') {
      return 'Stories + Mural';
    }
    if (destinos === 'STORY') {
      return 'Stories';
    }
    return 'Mural';
  }

  storyExpirado(foto: Foto): boolean {
    const hasStory = foto.destinosSolicitados === 'STORY' || foto.destinosSolicitados === 'AMBOS';
    return !!(hasStory && foto.expiresAt && new Date(foto.expiresAt).getTime() < Date.now() && !foto.destinos?.includes('STORY'));
  }

  storiesAtivos(): Foto[] {
    return this.midias().filter((foto) => foto.aprovada && foto.destinos?.includes('STORY'));
  }

  muralAtivo(): Foto[] {
    return this.midias().filter((foto) => foto.aprovada && foto.destinos?.includes('MURAL'));
  }

  formatExpires(foto: Foto): string {
    if (!foto.expiresAt) {
      return 'Permanente';
    }
    return new Date(foto.expiresAt).toLocaleString('pt-BR');
  }

  baixarQr() {
    const data = this.qrDataUrl();
    if (!data) {
      return;
    }
    const a = document.createElement('a');
    a.href = data;
    a.download = 'qr-mural-herois.png';
    a.click();
  }

  private montarQr() {
    const slug = this.party.slug();
    const url = `${window.location.origin}/festa/${slug}/camera`;
    this.cameraUrl.set(url);
    void this.qr.toDataUrl(url).then((data) => this.qrDataUrl.set(data));
  }

  baixar(foto: Foto) {
    this.admin.download(foto.id).subscribe({
      next: (blob) => {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = foto.nomeArquivo || `midia-${foto.id}`;
        a.click();
        URL.revokeObjectURL(url);
      },
      error: () => this.error.set('Não foi possível baixar o arquivo.'),
    });
  }
}
