import { Injectable, inject, signal } from '@angular/core';
import { Subscription } from 'rxjs';
import { ExamApiService } from '../services/exam-api.service';
import { SocketService } from '@core/services/socket.service';
import { NotificationService } from '@core/services/notification.service';

const EXTRACTION_TIMEOUT_MS = 60_000;

/**
 * Isola a máquina de estados de extração de PDF (upload -> progresso via
 * socket -> conclusão/erro/timeout), que antes vivia inteira dentro de
 * exam-form.component.ts junto com o formulário manual. É um problema
 * diferente o suficiente (orquestração assíncrona via socket + fallback de
 * timeout) para merecer sua própria facade em vez de inchar ExamsFacade.
 */
@Injectable({ providedIn: 'root' })
export class ExamExtractionFacade {
  private examApi = inject(ExamApiService);
  private socketSvc = inject(SocketService);
  private notification = inject(NotificationService);

  private extractingSignal = signal(false);
  private stepSignal = signal('Aguardando...');
  private progressSignal = signal(0);

  extracting = this.extractingSignal.asReadonly();
  step = this.stepSignal.asReadonly();
  progress = this.progressSignal.asReadonly();

  private subs: Subscription[] = [];
  private timeoutId?: ReturnType<typeof setTimeout>;

  /** Chamar no ngOnInit do componente. onComplete roda quando a extração termina com sucesso. */
  init(onComplete: (examId: number) => void): void {
    this.subs.push(
      this.socketSvc.extractionProgress$.subscribe(p => {
        this.stepSignal.set(p.step);
        this.progressSignal.set(p.progress);
      }),
      this.socketSvc.extractionComplete$.subscribe(({ exam }) => {
        this.finish();
        this.notification.success('Exame salvo com sucesso.', 'Extração concluída!');
        onComplete(exam.id);
      }),
      this.socketSvc.extractionError$.subscribe(({ error }) => {
        this.finish();
        this.notification.error(null, error, 'Erro na extração');
      }),
    );
  }

  /** Chamar no ngOnDestroy do componente. */
  destroy(): void {
    this.subs.forEach(s => s.unsubscribe());
    this.subs = [];
    clearTimeout(this.timeoutId);
  }

  upload(profileId: number, file: File): void {
    this.extractingSignal.set(true);
    this.stepSignal.set('Enviando PDF...');
    this.progressSignal.set(5);

    // Não depende só do socket: se nenhum evento de conclusão/erro chegar (ex:
    // conexão de tempo real indisponível), destrava o formulário mesmo assim.
    clearTimeout(this.timeoutId);
    this.timeoutId = setTimeout(() => {
      this.extractingSignal.set(false);
      this.notification.warn(
        'A extração está demorando mais que o esperado. Verifique a lista de exames em instantes.',
        'Sem resposta',
      );
    }, EXTRACTION_TIMEOUT_MS);

    this.examApi.uploadPdf(profileId, file).subscribe({
      error: err => {
        this.finish();
        this.notification.error(err, 'Erro no upload.');
      },
    });
  }

  private finish(): void {
    clearTimeout(this.timeoutId);
    this.extractingSignal.set(false);
  }
}
