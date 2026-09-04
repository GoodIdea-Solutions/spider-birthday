import { Component, HostListener, OnDestroy, OnInit, inject, signal } from '@angular/core';
import { Foto } from '../../core/models/party.models';
import { FotoService } from '../../core/services/foto.service';
import { PhotoWebSocketService } from '../../core/services/photo-websocket.service';
import { PartyConfigService } from '../../core/services/party-config.service';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-fotos-section',
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

  readonly fotos = signal<Foto[]>([]);
  readonly stories = signal<Foto[]>([]);
  readonly loading = signal(true);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly info = signal<string | null>(null);
  readonly previewUrl = signal<string | null>(null);
  readonly previewVideo = signal(false);
  readonly lightboxUrl = signal<string | null>(null);
  readonly lightboxVideo = signal(false);
  readonly storyIndex = signal<number | null>(null);
  readonly storyProgress = signal(0);

  private selectedFile: File | null = null;

  ngOnInit() {
    this.fotoService.listarAprovadas().subscribe({
      next: (items) => {
        this.fotos.set(items);
        this.loading.set(false);
      },
      error: () => {
        this.error.set('Não foi possível carregar o mural agora.');
        this.loading.set(false);
      },
    });
    this.fotoService.listarStories().subscribe({
      next: (items) => this.stories.set(items),
      error: () => undefined,
    });

    this.ws.connect();
    this.sub = this.ws.foto$.subscribe((foto) => {
      if (foto.tipo === 'STORY') {
        this.stories.update((list) => (list.some((f) => f.id === foto.id) ? list : [foto, ...list]));
      } else {
        this.fotos.update((list) => (list.some((f) => f.id === foto.id) ? list : [foto, ...list]));
      }
    });
  }

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
    this.info.set(null);
    this.error.set(null);

    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl()!);
    }

    if (file) {
      this.previewVideo.set(file.type.startsWith('video/'));
      this.previewUrl.set(URL.createObjectURL(file));
    } else {
      this.previewVideo.set(false);
      this.previewUrl.set(null);
    }
  }

  upload(tipo: 'MURAL' | 'STORY') {
    if (!this.selectedFile) {
      this.error.set('Escolha uma foto ou vídeo para enviar.');
      return;
    }

    this.uploading.set(true);
    this.error.set(null);
    this.fotoService.upload(this.selectedFile, tipo).subscribe({
      next: () => {
        this.uploading.set(false);
        this.info.set(
          tipo === 'STORY'
            ? 'Missão enviada! Seu story entra no mural depois da aprovação da HQ e fica no topo por 7 dias.'
            : 'Missão enviada! Sua foto entra no mural depois da aprovação da HQ.'
        );
        this.selectedFile = null;
        if (this.previewUrl()) {
          URL.revokeObjectURL(this.previewUrl()!);
          this.previewUrl.set(null);
        }
        this.previewVideo.set(false);
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err?.error?.message || 'Falha no envio. Imagem até 10MB ou vídeo MP4/WEBM até 50MB.');
      },
    });
  }

  openLightbox(foto: Foto) {
    this.lightboxUrl.set(foto.url);
    this.lightboxVideo.set(!!foto.video);
    document.body.classList.add('media-open');
  }

  closeLightbox() {
    this.lightboxUrl.set(null);
    this.lightboxVideo.set(false);
    if (this.storyIndex() === null) {
      document.body.classList.remove('media-open');
    }
  }

  @HostListener('document:keydown.escape')
  onEscape() {
    if (this.lightboxUrl()) {
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
    if (!this.lightboxUrl()) {
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

  currentStory(): Foto | null {
    const i = this.storyIndex();
    if (i === null) {
      return null;
    }
    return this.stories()[i] ?? null;
  }

  instagramNote(): string {
    const handle = this.instagram()?.instagramHandle?.trim();
    if (!handle || handle.includes('[')) {
      return '';
    }
    const tag = handle.startsWith('@') ? handle : '@' + handle;
    return `Se quiser, marque ${tag} também nos stories.`;
  }

  ngOnDestroy() {
    this.sub?.unsubscribe();
    this.ws.disconnect();
    this.clearStoryTimer();
    document.body.classList.remove('media-open');
    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl()!);
    }
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
