import { Component, ElementRef, OnDestroy, OnInit, inject, input, output, signal, viewChild } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { Subscription } from 'rxjs';
import { Presente, PresenteTipo, ProdutoLinkPreview } from '../../../core/models/party.models';
import { AdminService } from '../../../core/services/admin.service';

@Component({
  selector: 'app-admin-presente-form',
  imports: [FormsModule],
  templateUrl: './admin-presente-form.html',
  styleUrl: './admin-presente-form.scss',
})
export class AdminPresenteFormComponent implements OnInit, OnDestroy {
  private readonly admin = inject(AdminService);
  private readonly giftFileInput = viewChild<ElementRef<HTMLInputElement>>('giftFileInput');

  readonly presente = input<Presente | null>(null);
  readonly showCancel = input(false);
  readonly saved = output<void>();
  readonly cancelled = output<void>();

  giftNome = '';
  giftDescricao = '';
  giftLink = '';
  giftTipo: PresenteTipo | '' = '';
  giftPreco = '';
  giftImagemUrl = '';
  giftAtivo = true;
  giftFile: File | null = null;
  giftPreview: string | null = null;
  readonly giftPreviewLoading = signal(false);
  readonly giftPreviewMsg = signal<string | null>(null);
  readonly saving = signal(false);
  readonly error = signal<string | null>(null);

  private giftPreviewTimer: ReturnType<typeof setTimeout> | null = null;
  private giftPreviewSub: Subscription | null = null;
  private lastPreviewedLink = '';

  ngOnInit() {
    const item = this.presente();
    if (item) {
      this.preencher(item);
    }
  }

  ngOnDestroy() {
    this.cancelarPreviewAgendado();
    this.giftPreviewSub?.unsubscribe();
    this.revokeGiftPreview();
  }

  onGiftFile(event: Event) {
    const arquivo = event.target as HTMLInputElement;
    const file = arquivo.files?.[0] ?? null;
    this.revokeGiftPreview();
    this.giftFile = file;
    this.giftPreview = file ? URL.createObjectURL(file) : this.giftImagemUrl.trim() || null;
  }

  onGiftImagemUrlChange() {
    if (this.giftFile) {
      return;
    }
    this.giftPreview = this.giftImagemUrl.trim() || null;
  }

  onGiftLinkChange() {
    this.agendarPreviewDaLoja();
  }

  carregarDadosDaLoja(forcar = false) {
    this.cancelarPreviewAgendado();
    const url = this.giftLink.trim();
    if (!/^https?:\/\//i.test(url)) {
      if (forcar) {
        this.giftPreviewMsg.set('Informe um link http(s) da loja.');
      }
      return;
    }
    if (!forcar && (url === this.lastPreviewedLink || this.giftPreviewLoading())) {
      return;
    }

    this.giftPreviewSub?.unsubscribe();
    this.lastPreviewedLink = url;
    this.giftPreviewLoading.set(true);
    this.giftPreviewMsg.set('Buscando dados da loja...');
    this.giftPreviewSub = this.admin.previewPresente(url).subscribe({
      next: (preview) => {
        this.giftPreviewLoading.set(false);
        this.aplicarPreviewDaLoja(preview, forcar);
      },
      error: (err) => {
        this.giftPreviewLoading.set(false);
        this.giftPreviewMsg.set(
          this.mensagemErro(err, 'Não foi possível ler os dados desta loja. Preencha na mão.')
        );
      },
    });
  }

  salvar() {
    const nome = this.giftNome.trim();
    if (!nome) {
      this.error.set('Nome do presente é obrigatório.');
      return;
    }
    if (!this.giftTipo) {
      this.error.set('Tipo do presente é obrigatório.');
      return;
    }

    const data = new FormData();
    data.append('nome', nome);
    data.append('descricao', this.giftDescricao.trim());
    data.append('link', this.giftLink.trim());
    data.append('tipo', this.giftTipo);
    data.append('preco', this.giftPreco.trim());
    data.append('ativo', String(this.giftAtivo));
    if (this.giftImagemUrl.trim()) {
      data.append('imagemUrl', this.giftImagemUrl.trim());
    }
    if (this.giftFile) {
      data.append('file', this.giftFile);
    }

    this.saving.set(true);
    this.error.set(null);
    this.admin.salvarPresente(data, this.presente()?.id ?? null).subscribe({
      next: () => {
        this.saving.set(false);
        this.reset();
        this.saved.emit();
      },
      error: (err) => {
        this.saving.set(false);
        this.error.set(this.mensagemErro(err, 'Não foi possível salvar o presente.'));
      },
    });
  }

  cancelar() {
    this.reset();
    this.cancelled.emit();
  }

  private preencher(item: Presente) {
    this.giftNome = item.nome;
    this.giftDescricao = item.descricao ?? '';
    this.giftLink = item.link ?? '';
    this.giftTipo = item.tipo ?? '';
    this.giftPreco = this.formatarPrecoInput(item.preco);
    this.giftImagemUrl = item.imagemUrl ?? '';
    this.giftAtivo = item.ativo;
    this.giftFile = null;
    this.revokeGiftPreview();
    this.giftPreview = item.imagemUrl;
    this.giftPreviewMsg.set(null);
    this.lastPreviewedLink = item.link ?? '';
    this.error.set(null);
  }

  private reset() {
    this.giftNome = '';
    this.giftDescricao = '';
    this.giftLink = '';
    this.giftTipo = '';
    this.giftPreco = '';
    this.giftImagemUrl = '';
    this.giftAtivo = true;
    this.giftFile = null;
    this.revokeGiftPreview();
    this.giftPreview = null;
    this.giftPreviewMsg.set(null);
    this.lastPreviewedLink = '';
    this.giftPreviewSub?.unsubscribe();
    this.giftPreviewLoading.set(false);
    this.error.set(null);
    const arquivo = this.giftFileInput()?.nativeElement;
    if (arquivo) {
      arquivo.value = '';
    }
  }

  private agendarPreviewDaLoja() {
    this.cancelarPreviewAgendado();
    this.giftPreviewTimer = setTimeout(() => this.carregarDadosDaLoja(false), 600);
  }

  private cancelarPreviewAgendado() {
    if (this.giftPreviewTimer) {
      clearTimeout(this.giftPreviewTimer);
      this.giftPreviewTimer = null;
    }
  }

  private aplicarPreviewDaLoja(preview: ProdutoLinkPreview, sobrescrever: boolean) {
    if (!preview.encontrados?.length) {
      this.giftPreviewMsg.set('Não foi possível ler os dados desta loja. Preencha na mão.');
      return;
    }

    if (preview.titulo && (sobrescrever || !this.giftNome.trim())) {
      this.giftNome = preview.titulo;
    }
    if (preview.descricao && (sobrescrever || !this.giftDescricao.trim())) {
      this.giftDescricao = preview.descricao;
    }
    if (preview.preco && (sobrescrever || !this.giftPreco.trim())) {
      const precoNumero = Number(preview.preco);
      if (!Number.isNaN(precoNumero)) {
        this.giftPreco = this.formatarPrecoInput(precoNumero);
      }
    }
    if (preview.imagemUrl && !this.giftFile && (sobrescrever || !this.giftImagemUrl.trim())) {
      this.giftImagemUrl = preview.imagemUrl;
      this.giftPreview = preview.imagemUrl;
    }

    this.giftPreviewMsg.set(this.mensagemPreview(preview.encontrados));
  }

  private mensagemPreview(encontrados: string[]): string {
    const labels: Record<string, string> = {
      titulo: 'título',
      descricao: 'descrição',
      preco: 'preço',
      imagem: 'foto',
    };
    const nomes = encontrados.map((item) => labels[item] ?? item);
    if (nomes.length === 1) {
      return `Encontramos ${nomes[0]}. Os demais campos podem ser preenchidos na mão.`;
    }
    const ultimo = nomes[nomes.length - 1];
    const resto = nomes.slice(0, -1).join(', ');
    const prefixo = `Encontramos ${resto} e ${ultimo}.`;
    if (!encontrados.includes('preco')) {
      return `${prefixo} Preencha o preço se a loja não disponibilizou.`;
    }
    return prefixo;
  }

  private formatarPrecoInput(preco: number | null | undefined): string {
    if (preco == null || Number.isNaN(Number(preco))) {
      return '';
    }
    return new Intl.NumberFormat('pt-BR', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(Number(preco));
  }

  private revokeGiftPreview() {
    if (this.giftPreview?.startsWith('blob:')) {
      URL.revokeObjectURL(this.giftPreview);
    }
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
}
