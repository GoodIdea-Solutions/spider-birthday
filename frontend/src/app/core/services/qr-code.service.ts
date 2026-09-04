import { Injectable } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class QrCodeService {
  async toDataUrl(text: string): Promise<string> {
    try {
      const mod = (await import('qrcode')) as {
        toDataURL?: (value: string, options: object) => Promise<string>;
        default?: { toDataURL?: (value: string, options: object) => Promise<string> };
      };
      const toDataURL = mod.toDataURL ?? mod.default?.toDataURL;
      if (!toDataURL) {
        throw new Error('QR library unavailable');
      }
      return await toDataURL(text, {
        width: 360,
        margin: 2,
        errorCorrectionLevel: 'M',
        color: { dark: '#0b1228', light: '#ffffff' },
      });
    } catch {
      return `https://api.qrserver.com/v1/create-qr-code/?size=360x360&data=${encodeURIComponent(text)}`;
    }
  }
}
