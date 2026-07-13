import { Injectable, OnDestroy } from '@angular/core';
import { Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { environment } from '../../../environments/environment';
import { AuthService } from './auth.service';

export interface ExtractionProgress {
  examId: number;
  step: string;
  progress: number; // 0-100
}

@Injectable({ providedIn: 'root' })
export class SocketService implements OnDestroy {
  private socket?: Socket;

  readonly extractionProgress$ = new Subject<ExtractionProgress>();
  readonly extractionComplete$ = new Subject<{ examId: number; exam: any }>();
  readonly extractionError$ = new Subject<{ examId: number; error: string }>();

  constructor(private auth: AuthService) { }

  connect(): void {
    if (this.socket?.connected) return;
    const token = this.auth.token();
    if (!token) return;

    this.socket = io(environment.wsUrl, {
      auth: { token },
      transports: ['websocket'],
    });

    this.socket.on('connect', () => {
      console.log('🔌 socket conectado, emitindo join_room para:', this.auth.user()?.id);
      const user = this.auth.user();
      if (user?.id) this.socket!.emit('join_room', user.id);
    });
    this.socket.on('extraction_progress', (data: ExtractionProgress) =>
      this.extractionProgress$.next(data)
    );
    this.socket.on('extraction_complete', (data: any) =>
      this.extractionComplete$.next(data)
    );
    this.socket.on('extraction_error', (data: any) =>
      this.extractionError$.next(data)
    );
  }

  disconnect(): void {
    this.socket?.disconnect();
  }

  ngOnDestroy(): void {
    this.disconnect();
  }
}
