import { Component, effect, inject } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Toast } from 'primeng/toast';
import { MessageService } from 'primeng/api';
import { AuthService } from './core/services/auth.service';
import { SocketService } from './core/services/socket.service';

@Component({
  selector: 'app-root',
  standalone: true,
  imports: [RouterOutlet, Toast],
  providers: [MessageService],
  template: `
    <p-toast position="top-right" [life]="4000" />
    <router-outlet />
  `,
})
export class AppComponent {
  private auth = inject(AuthService);
  private socket = inject(SocketService);

  constructor() {
    // Garante que o socket conecte sempre que houver uma sessão válida (incluindo
    // ao recarregar a página com um token já salvo, não só no submit do login) e
    // desconecte no logout.
    effect(() => {
      if (this.auth.isAuth()) this.socket.connect();
      else this.socket.disconnect();
    });
  }
}
