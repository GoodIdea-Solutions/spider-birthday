import { Injectable, signal } from '@angular/core';

@Injectable({ providedIn: 'root' })
export class RsvpModalService {
  private readonly _open = signal(false);
  readonly isOpen = this._open.asReadonly();

  open() {
    this._open.set(true);
  }

  close() {
    this._open.set(false);
  }
}
