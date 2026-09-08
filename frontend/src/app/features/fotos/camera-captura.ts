import {
  AfterViewInit,
  Component,
  ElementRef,
  OnDestroy,
  ViewChild,
  computed,
  inject,
  signal,
} from '@angular/core';
import { RouterLink } from '@angular/router';
import { FotoService } from '../../core/services/foto.service';
import { PartyConfigService } from '../../core/services/party-config.service';

export type FiltroCamera = 'nenhum' | 'teia' | 'samuel' | 'anos' | 'moldura';
type ModoCamera = 'starting' | 'live' | 'review' | 'success' | 'fallback';

const TEIA_TL =
  'M0 0 L90 70 M0 30 L70 90 M30 0 L95 55 M0 60 L50 100 M60 0 L100 40 M10 10 Q55 40 90 70 Q40 55 10 10 M20 5 Q60 35 85 60';
const TEIA_BR =
  'M200 200 L110 130 M200 170 L130 110 M170 200 L105 145 M200 140 L150 100 M140 200 L100 160 M190 190 Q145 160 110 130 Q160 145 190 190';

@Component({
  selector: 'app-camera-captura',
  imports: [RouterLink],
  templateUrl: './camera-captura.html',
  styleUrl: './camera-captura.scss',
})
export class CameraCapturaComponent implements AfterViewInit, OnDestroy {
  private readonly fotoService = inject(FotoService);
  private readonly party = inject(PartyConfigService);

  @ViewChild('preview') previewRef?: ElementRef<HTMLVideoElement>;

  readonly mode = signal<ModoCamera>('starting');
  readonly filtro = signal<FiltroCamera>('teia');
  readonly facing = signal<'environment' | 'user'>('environment');
  readonly pronta = signal(false);
  readonly capturing = signal(false);
  readonly uploading = signal(false);
  readonly error = signal<string | null>(null);
  readonly cameraError = signal<string | null>(null);
  readonly previewUrl = signal<string | null>(null);

  readonly nome = computed(() => this.party.config()?.nomeCrianca?.trim() || 'Samuel');
  readonly idade = computed(() => this.party.config()?.idade?.trim() || '3');
  readonly filtros = computed(() => [
    { id: 'nenhum' as const, label: 'Nenhum' },
    { id: 'teia' as const, label: 'Teia' },
    { id: 'samuel' as const, label: this.nome() },
    { id: 'anos' as const, label: `${this.idade()} anos` },
    { id: 'moldura' as const, label: 'Moldura HQ' },
  ]);

  readonly teiaTl = TEIA_TL;
  readonly teiaBr = TEIA_BR;

  private stream: MediaStream | null = null;
  private capturedFile: File | null = null;
  private usedFallback = false;

  ngAfterViewInit() {
    void this.abrirCamera();
  }

  ngOnDestroy() {
    this.pararStream();
    this.revokePreview();
  }

  escolherFiltro(id: FiltroCamera) {
    this.filtro.set(id);
  }

  async alternarCamera() {
    if (this.mode() !== 'live') {
      return;
    }
    this.facing.set(this.facing() === 'environment' ? 'user' : 'environment');
    await this.abrirCamera();
  }

  async capturar() {
    const video = this.previewRef?.nativeElement;
    if (!video || !video.videoWidth || this.capturing() || this.mode() !== 'live') {
      return;
    }

    this.capturing.set(true);
    this.error.set(null);

    try {
      await document.fonts.ready.catch(() => undefined);

      const viewW = Math.max(1, video.clientWidth);
      const viewH = Math.max(1, video.clientHeight);
      const crop = coverCrop(video.videoWidth, video.videoHeight, viewW, viewH);
      const scale = Math.min(1, 1920 / Math.max(viewW, viewH));
      const w = Math.max(1, Math.round(viewW * scale));
      const h = Math.max(1, Math.round(viewH * scale));

      const canvas = document.createElement('canvas');
      canvas.width = w;
      canvas.height = h;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        throw new Error('canvas');
      }

      if (this.facing() === 'user') {
        ctx.save();
        ctx.translate(w, 0);
        ctx.scale(-1, 1);
        ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
        ctx.restore();
      } else {
        ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, w, h);
      }

      this.desenharFiltro(ctx, w, h);

      const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/jpeg', 0.85));
      if (!blob) {
        throw new Error('blob');
      }

      this.capturedFile = new File([blob], `festa-${Date.now()}.jpg`, { type: 'image/jpeg' });
      this.revokePreview();
      this.previewUrl.set(URL.createObjectURL(this.capturedFile));
      this.mode.set('review');
    } catch {
      this.error.set('Não deu para capturar. Tente de novo.');
    } finally {
      this.capturing.set(false);
    }
  }

  enviar() {
    if (!this.capturedFile || this.uploading()) {
      return;
    }

    this.uploading.set(true);
    this.error.set(null);
    this.fotoService.upload(this.capturedFile, 'AMBOS').subscribe({
      next: () => {
        this.uploading.set(false);
        this.capturedFile = null;
        this.revokePreview();
        this.mode.set('success');
      },
      error: (err: { error?: { message?: string } }) => {
        this.uploading.set(false);
        this.error.set(err?.error?.message || 'Falha no envio. Foto até 10MB.');
      },
    });
  }

  onVideoReady() {
    const video = this.previewRef?.nativeElement;
    this.pronta.set(!!video && video.videoWidth > 0);
  }

  tirarOutra() {
    this.error.set(null);
    this.capturedFile = null;
    this.revokePreview();
    if (this.stream) {
      this.mode.set('live');
      return;
    }
    if (this.usedFallback) {
      this.mode.set('fallback');
      return;
    }
    void this.abrirCamera();
  }

  tentarCamera() {
    this.usedFallback = false;
    this.error.set(null);
    this.cameraError.set(null);
    void this.abrirCamera();
  }

  onFallbackFile(event: Event) {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0] ?? null;
    input.value = '';
    this.error.set(null);

    if (!file) {
      return;
    }
    if (!file.type.startsWith('image/')) {
      this.error.set('Neste atalho envie só foto. Vídeo fica no mural.');
      return;
    }
    if (file.size > 10 * 1024 * 1024) {
      this.error.set('Foto até 10MB.');
      return;
    }

    this.usedFallback = true;
    this.capturedFile = file;
    this.revokePreview();
    this.previewUrl.set(URL.createObjectURL(file));
    this.mode.set('review');
  }

  async abrirCamera() {
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia) {
      this.irParaFallback(
        window.isSecureContext
          ? 'Seu navegador não abre câmera ao vivo. Envie uma foto da galeria.'
          : 'A câmera ao vivo precisa de HTTPS. Envie uma foto da galeria ou da câmera do celular.'
      );
      return;
    }

    this.pronta.set(false);
    this.mode.set('starting');
    this.pararStream();

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: false,
        video: {
          facingMode: { ideal: this.facing() },
          width: { ideal: 1280 },
          height: { ideal: 1920 },
        },
      });

      const video = this.previewRef?.nativeElement;
      if (!video) {
        stream.getTracks().forEach((track) => track.stop());
        this.irParaFallback('Não foi possível ligar a prévia da câmera. Envie uma foto da galeria.');
        return;
      }

      this.stream = stream;
      video.srcObject = stream;
      video.muted = true;
      video.playsInline = true;
      video.setAttribute('playsinline', '');
      video.setAttribute('webkit-playsinline', '');
      await video.play();
      this.pronta.set(video.videoWidth > 0);
      this.mode.set('live');
    } catch (err) {
      this.irParaFallback(this.mensagemErroCamera(err));
    }
  }

  private irParaFallback(mensagem: string) {
    this.pararStream();
    this.usedFallback = true;
    this.pronta.set(false);
    this.cameraError.set(mensagem);
    this.mode.set('fallback');
  }

  private mensagemErroCamera(err: unknown) {
    const name = err instanceof DOMException ? err.name : '';
    if (name === 'NotAllowedError' || name === 'PermissionDeniedError') {
      return 'A câmera foi bloqueada. Permita o acesso nas configurações do navegador ou envie uma foto da galeria.';
    }
    if (name === 'NotFoundError' || name === 'DevicesNotFoundError') {
      return 'Nenhuma câmera encontrada. Envie uma foto da galeria.';
    }
    if (name === 'NotReadableError' || name === 'TrackStartError') {
      return 'A câmera está ocupada em outro app. Feche e tente de novo, ou envie uma foto da galeria.';
    }
    return 'Não foi possível abrir a câmera. Envie uma foto da galeria.';
  }

  private pararStream() {
    this.stream?.getTracks().forEach((track) => track.stop());
    this.stream = null;
    const video = this.previewRef?.nativeElement;
    if (video) {
      video.srcObject = null;
    }
  }

  private revokePreview() {
    const url = this.previewUrl();
    if (url) {
      URL.revokeObjectURL(url);
      this.previewUrl.set(null);
    }
  }

  private desenharFiltro(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const filtro = this.filtro();
    if (filtro === 'nenhum') {
      return;
    }
    if (filtro === 'teia') {
      this.desenharTeia(ctx, w, h);
      return;
    }
    if (filtro === 'samuel') {
      this.desenharSamuel(ctx, w, h);
      return;
    }
    if (filtro === 'anos') {
      this.desenharAnos(ctx, w, h);
      return;
    }
    this.desenharMoldura(ctx, w, h);
  }

  private desenharTeia(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const size = Math.min(w, h) * 0.42;
    const scale = size / 200;
    ctx.save();
    ctx.lineCap = 'round';
    ctx.lineJoin = 'round';
    this.strokeWeb(ctx, new Path2D(TEIA_TL), scale, 0, 0);
    this.strokeWeb(ctx, new Path2D(TEIA_BR), scale, w - size, h - size);
    ctx.restore();
  }

  private strokeWeb(ctx: CanvasRenderingContext2D, path: Path2D, scale: number, x: number, y: number) {
    ctx.save();
    ctx.translate(x, y);
    ctx.scale(scale, scale);
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.4)';
    ctx.lineWidth = 4.2;
    ctx.stroke(path);
    ctx.strokeStyle = 'rgba(248, 250, 252, 0.92)';
    ctx.lineWidth = 2.2;
    ctx.stroke(path);
    ctx.restore();
  }

  private desenharSamuel(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const text = this.nome().toUpperCase();
    const fontSize = Math.min(w * 0.2, h * 0.11);
    ctx.save();
    ctx.font = `${fontSize}px Bangers, "Trebuchet MS", cursive`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    const x = w / 2;
    const y = h * 0.07;
    ctx.fillStyle = '#1e3a8a';
    ctx.fillText(text, x + fontSize * 0.06, y + fontSize * 0.06);
    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;
    ctx.strokeStyle = '#111';
    ctx.lineWidth = Math.max(4, fontSize * 0.08);
    ctx.strokeText(text, x, y);
    ctx.fillStyle = '#e11d2e';
    ctx.fillText(text, x, y);
    ctx.restore();
  }

  private desenharAnos(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const label = `${this.idade()} ANOS`;
    const bw = w * 0.58;
    const bh = Math.min(h * 0.1, 86);
    ctx.save();
    ctx.translate(w / 2, h * 0.84);
    ctx.rotate(-0.035);
    ctx.fillStyle = '#1e3a8a';
    ctx.fillRect(-bw / 2 + 6, -bh / 2 + 6, bw, bh);
    const grad = ctx.createLinearGradient(-bw / 2, 0, bw / 2, 0);
    grad.addColorStop(0, '#e11d2e');
    grad.addColorStop(1, '#9f1239');
    ctx.fillStyle = grad;
    ctx.fillRect(-bw / 2, -bh / 2, bw, bh);
    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 4;
    ctx.strokeRect(-bw / 2, -bh / 2, bw, bh);
    ctx.font = `${Math.min(bw * 0.22, bh * 0.62)}px Bangers, "Trebuchet MS", cursive`;
    ctx.fillStyle = '#fff';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(label, 0, 2);
    ctx.restore();
  }

  private desenharMoldura(ctx: CanvasRenderingContext2D, w: number, h: number) {
    const outer = Math.max(10, Math.round(Math.min(w, h) * 0.028));
    const red = Math.max(8, Math.round(Math.min(w, h) * 0.022));
    ctx.fillStyle = '#111';
    ctx.fillRect(0, 0, w, outer);
    ctx.fillRect(0, h - outer, w, outer);
    ctx.fillRect(0, 0, outer, h);
    ctx.fillRect(w - outer, 0, outer, h);

    ctx.strokeStyle = '#e11d2e';
    ctx.lineWidth = red;
    ctx.strokeRect(outer + red / 2, outer + red / 2, w - outer * 2 - red, h - outer * 2 - red);

    ctx.strokeStyle = '#f8fafc';
    ctx.lineWidth = 3;
    const inset = outer + red + 6;
    ctx.strokeRect(inset, inset, w - inset * 2, h - inset * 2);

    const tick = Math.max(18, Math.round(Math.min(w, h) * 0.045));
    ctx.strokeStyle = '#111';
    ctx.lineWidth = 5;
    const corners: Array<[number, number, number, number, number, number]> = [
      [inset, inset + tick, inset, inset, inset + tick, inset],
      [w - inset - tick, inset, w - inset, inset, w - inset, inset + tick],
      [inset, h - inset - tick, inset, h - inset, inset + tick, h - inset],
      [w - inset - tick, h - inset, w - inset, h - inset, w - inset, h - inset - tick],
    ];
    for (const [x1, y1, x2, y2, x3, y3] of corners) {
      ctx.beginPath();
      ctx.moveTo(x1, y1);
      ctx.lineTo(x2, y2);
      ctx.lineTo(x3, y3);
      ctx.stroke();
    }
  }
}

function coverCrop(videoW: number, videoH: number, viewW: number, viewH: number) {
  const videoRatio = videoW / videoH;
  const viewRatio = viewW / viewH;
  if (videoRatio > viewRatio) {
    const sh = videoH;
    const sw = videoH * viewRatio;
    return { sx: (videoW - sw) / 2, sy: 0, sw, sh };
  }
  const sw = videoW;
  const sh = videoW / viewRatio;
  return { sx: 0, sy: (videoH - sh) / 2, sw, sh };
}
