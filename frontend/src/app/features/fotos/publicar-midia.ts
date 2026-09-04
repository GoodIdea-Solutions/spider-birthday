import { Component, EventEmitter, Input, OnDestroy, Output, inject, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { FotoDestinos } from '../../core/models/party.models';
import { FotoService } from '../../core/services/foto.service';

@Component({
  selector: 'app-publicar-midia',
  imports: [RouterLink],
  templateUrl: './publicar-midia.html',
  styleUrl: './publicar-midia.scss',
})
export class PublicarMidiaComponent implements OnDestroy {
  private readonly fotoService = inject(FotoService);

  @Input() variant: 'mural' | 'camera' = 'mural';
  @Output() readonly enviada = new EventEmitter<void>();

  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly success = signal(false);
  readonly previewUrl = signal<string | null>(null);
  readonly previewVideo = signal(false);
  readonly destinos = signal<FotoDestinos | null>(null);

  private selectedFile: File | null = null;

  onFileChange(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    this.selectedFile = file;
    this.success.set(false);
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

  escolherDestino(destinos: FotoDestinos) {
    this.destinos.set(destinos);
    this.error.set(null);
  }

  enviar() {
    if (!this.selectedFile) {
      this.error.set('Escolha uma foto ou vídeo para enviar.');
      return;
    }
    const destinos = this.destinos();
    if (!destinos) {
      this.error.set('Escolha onde publicar: Stories, Mural ou os dois.');
      return;
    }

    this.uploading.set(true);
    this.error.set(null);
    this.fotoService.upload(this.selectedFile, destinos).subscribe({
      next: () => {
        this.uploading.set(false);
        this.success.set(true);
        this.selectedFile = null;
        this.destinos.set(null);
        if (this.previewUrl()) {
          URL.revokeObjectURL(this.previewUrl()!);
          this.previewUrl.set(null);
        }
        this.previewVideo.set(false);
        this.enviada.emit();
      },
      error: (err) => {
        this.uploading.set(false);
        this.error.set(err?.error?.message || 'Falha no envio. Imagem até 10MB ou vídeo MP4/WEBM até 50MB.');
      },
    });
  }

  enviarOutro() {
    this.success.set(false);
    this.error.set(null);
    this.destinos.set(null);
  }

  ngOnDestroy() {
    if (this.previewUrl()) {
      URL.revokeObjectURL(this.previewUrl()!);
    }
  }
}
