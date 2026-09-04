import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Foto } from '../../core/models/party.models';
import { FotoService } from '../../core/services/foto.service';
import { PhotoWebSocketService } from '../../core/services/photo-websocket.service';
import { PartyConfigService } from '../../core/services/party-config.service';
import { PublicarMidiaComponent } from './publicar-midia';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-fotos-section',
  imports: [PublicarMidiaComponent],
  templateUrl: './fotos-section.html',
  styleUrl: './fotos-section.scss',
})
export class FotosSectionComponent implements OnInit, OnDestroy {
  private readonly fotoService = inject(FotoService);
  private readonly ws = inject(PhotoWebSocketService);
  private readonly party = inject(PartyConfigService);

  readonly instagram = this.party.config;
  private sub?: Subscription;
  private storyTimer?: ReturnType<typeof setTimeout>;
  private muralPage = 0;
  private readonly muralSize = 12;

  readonly fotos = signal<Foto[]>([]);
  readonly stories = signal<Foto[]>([]);
  readonly loading = signal(true);
  readonly loadingMore = signal(false);
  readonly hasMore = signal(false);
  readonly error = signal<string | null>(null);
  readonly shareNote = signal<string | null>(null);
  readonly lightboxFoto = signal<Foto | null>(null);
  readonly storyIndex = signal<number | null>(null);
  readonly storyProgress = signal(0);

  ngOnInit() {
    this.carregarMural(true);
    this.fotoService.listarStories().subscribe({
      next: (items) => this.stories.set(items),
      error: () => undefined,
    });

    this.ws.connect();
    this.sub = this.ws.foto$.subscribe((foto) => this.aplicarFotoAprovada(foto));
  }

  carregarMais() {
    this.muralPage += 1;
    this.carregarMural(false);
  }

  openLightbox(foto: Foto) {
    this.lightboxFoto.set(foto);
    this.shareNote.set(null);
    document.body.classList.add('media-open');
  }

  closeLightbox() {
    this.lightboxFoto.set(null);
    this.shareNote.set(null);
    if (this.storyIndex() === null) {
      document.body.classList.remove('media-open');
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.lightboxFoto()) {
      this.closeLightbox();
      return;
    }
    if (this.storyIndex() !== null) {
      this.closeStory();
    }
  }

  openStory(index: number) {
    this.storyIndex.set(index);
    this.storyProgress.set(0);
    document.body.classList.add('media-open');
    this.scheduleStoryAdvance();
  }

  closeStory() {
    this.clearStoryTimer();
    this.storyIndex.set(null);
    this.storyProgress.set(0);
    if (!this.lightboxFoto()) {
      document.body.classList.remove('media-open');
    }
  }

  storyTap(event: MouseEvent) {
    const width = (event.currentTarget as HTMLElement).clientWidth;
    if (event.offsetX < width / 2) {
      this.prevStory();
    } else {
      this.nextStory();
    }
  }

  nextStory() {
    const i = this.storyIndex();
    if (i === null) {
      return;
    }
    if (i + 1 >= this.stories().length) {
      this.closeStory();
      return;
    }
    this.storyIndex.set(i + 1);
    this.storyProgress.set(0);
    this.scheduleStoryAdvance();
  }

  prevStory() {
    const i = this.storyIndex();
    if (i === null || i === 0) {
      return;
    }
    this.storyIndex.set(i - 1);
    this.storyProgress.set(0);
    this.scheduleStoryAdvance();
  }

  onStoryVideoEnded() {
    this.nextStory();
  }

  onStoryVideoProgress(event: Event) {
    const video = event.target as HTMLVideoElement;
    if (video.duration > 0) {
      this.storyProgress.set((video.currentTime / video.duration) * 100);
    }
  }

  currentStory(): Foto | null {
    const i = this.storyIndex();
    if (i === null) {
      return null;
    }
    return this.stories()[i] ?? null;
  }

  tempoRestante(foto: Foto | null): string {
    if (!foto?.expiresAt) {
      return 'Até 7 dias';
    }
    const ms = new Date(foto.expiresAt).getTime() - Date.now();
    if (ms <= 0) {
      return 'Expirado';
    }
    const days = Math.floor(ms / 86_400_000);
    const hours = Math.ceil((ms % 86_400_000) / 3_600_000);
    if (days >= 1) {
      return days === 1 ? '1 dia restante' : `${days} dias restantes`;
    }
    if (hours <= 1) {
      return 'Menos de 1 hora';
    }
    return `${hours} horas restantes`;
  }

  instagramNote(): string {
    const handle = this.instagram()?.instagramHandle?.trim();
    if (!handle || handle.includes('[')) {
      return '';
    }
    const tag = handle.startsWith('@') ? handle : '@' + handle;
    return `Se quiser, marque ${tag} também nos stories.`;
  }

  async baixarFoto(foto: Foto, event?: Event) {
    event?.stopPropagation();
    try {
      const response = await fetch(foto.url);
      const blob = await response.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = foto.nomeArquivo || `mural-${foto.id}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      this.shareNote.set('Não foi possível baixar agora.');
    }
  }

  async compartilharFoto(foto: Foto, event?: Event) {
    event?.stopPropagation();
    const url = foto.url.startsWith('http') ? foto.url : `${window.location.origin}${foto.url}`;
    try {
      if (navigator.share) {
        await navigator.share({ title: 'Mural dos Heróis', url });
        return;
      }
      await navigator.clipboard.writeText(url);
      this.shareNote.set('Link copiado!');
    } catch {
      this.shareNote.set('Não foi possível compartilhar agora.');
    }
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.ws.disconnect();
    this.clearStoryTimer();
    document.body.classList.remove('media-open');
  }

  private aplicarFotoAprovada(foto: Foto) {
    const destinos = foto.destinos?.length ? foto.destinos : [foto.tipo];
    if (destinos.includes('STORY')) {
      this.stories.update((list) => (list.some((f) => f.id === foto.id) ? list : [foto, ...list]));
    }
    if (destinos.includes('MURAL')) {
      this.fotos.update((list) => (list.some((f) => f.id === foto.id) ? list : [foto, ...list]));
    }
  }

  private carregarMural(reset: boolean) {
    if (reset) {
      this.muralPage = 0;
      this.loading.set(true);
    } else {
      this.loadingMore.set(true);
    }
    this.fotoService.listarAprovadas(this.muralPage, this.muralSize).subscribe({
      next: (page) => {
        this.fotos.update((list) => (reset ? page.items : [...list, ...page.items]));
        this.hasMore.set(page.hasMore);
        this.loading.set(false);
        this.loadingMore.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar o mural agora.');
        this.loading.set(false);
        this.loadingMore.set(false);
        if (!reset) {
          this.muralPage = Math.max(0, this.muralPage - 1);
        }
      },
    });
  }

  private scheduleStoryAdvance() {
    this.clearStoryTimer();
    const story = this.currentStory();
    if (!story || story.video) {
      return;
    }
    this.storyProgress.set(100);
    this.storyTimer = setTimeout(() => this.nextStory(), 5000);
  }

  private clearStoryTimer() {
    if (this.storyTimer) {
      clearTimeout(this.storyTimer);
      this.storyTimer = undefined;
    }
  }
}
