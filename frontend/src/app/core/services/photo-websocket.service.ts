import { Injectable, OnDestroy } from '@angular/core';
import { Client, IMessage } from '@stomp/stompjs';
import SockJS from 'sockjs-client';
import { Subject } from 'rxjs';
import { Foto } from '../models/party.models';

@Injectable({ providedIn: 'root' })
export class PhotoWebSocketService implements OnDestroy {
  private client?: Client;
  private readonly fotoSubject = new Subject<Foto>();
  readonly foto$ = this.fotoSubject.asObservable();

  connect() {
    if (this.client?.active) {
      return;
    }

    this.client = new Client({
      webSocketFactory: () => new SockJS('/ws') as WebSocket,
      reconnectDelay: 4000,
      onConnect: () => {
        this.client?.subscribe('/topic/fotos', (message: IMessage) => {
          const foto = JSON.parse(message.body) as Foto;
          this.fotoSubject.next(foto);
        });
      },
    });

    this.client.activate();
  }

  disconnect() {
    void this.client?.deactivate();
  }

  ngOnDestroy() {
    this.disconnect();
  }
}
