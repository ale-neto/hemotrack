import { Injectable, inject } from '@angular/core';
import { MessageService } from 'primeng/api';

/**
 * Camada fina sobre o MessageService do PrimeNG. Centraliza o formato de toast
 * usado em toda a aplicação (antes duplicado em ~20 chamadas por vários
 * componentes) e a extração da mensagem de erro vinda da API
 * (`err.error?.error`), com um fallback textual quando a API não informa nada.
 */
@Injectable({ providedIn: 'root' })
export class NotificationService {
  private messageService = inject(MessageService);

  success(detail: string, summary = 'Sucesso'): void {
    this.messageService.add({ severity: 'success', summary, detail });
  }

  error(err: unknown, fallback: string, summary = 'Erro'): void {
    const detail = (err as { error?: { error?: string } })?.error?.error || fallback;
    this.messageService.add({ severity: 'error', summary, detail });
  }

  warn(detail: string, summary = 'Aviso'): void {
    this.messageService.add({ severity: 'warn', summary, detail });
  }
}
