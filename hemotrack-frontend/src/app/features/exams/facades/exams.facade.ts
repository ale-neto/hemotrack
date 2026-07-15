import { Injectable, inject, signal } from '@angular/core';
import { ExamApiService, ExamFilters } from '../services/exam-api.service';
import { ProfileApiService } from '@features/profiles/services/profile-api.service';
import { ExamTypeApiService } from '../services/exam-type-api.service';
import { NotificationService } from '@core/services/notification.service';
import { BloodExam, ExamType } from '../models/exam.model';
import { Profile } from '@features/profiles/models/profile.model';

/**
 * Única porta de entrada dos componentes de exams para dados e regras de
 * negócio. Componentes nunca chamam ExamApiService/HttpClient diretamente
 * nem se inscrevem (`.subscribe`) em nada — só leem os Signals daqui e
 * chamam os métodos, passando um callback para "o que fazer depois do
 * sucesso" (ex: navegar para outra rota).
 */
@Injectable({ providedIn: 'root' })
export class ExamsFacade {
  private examApi     = inject(ExamApiService);
  private profileApi  = inject(ProfileApiService);
  private examTypeApi = inject(ExamTypeApiService);
  private notification = inject(NotificationService);

  private examsSignal       = signal<BloodExam[]>([]);
  private profilesSignal    = signal<Profile[]>([]);
  private examTypesSignal   = signal<ExamType[]>([]);
  private loadingSignal     = signal(false);
  private currentExamSignal = signal<BloodExam | null>(null);
  private loadingDetailSignal = signal(true);

  exams     = this.examsSignal.asReadonly();
  profiles  = this.profilesSignal.asReadonly();
  examTypes = this.examTypesSignal.asReadonly();
  loading   = this.loadingSignal.asReadonly();
  currentExam    = this.currentExamSignal.asReadonly();
  loadingDetail  = this.loadingDetailSignal.asReadonly();

  loadExam(id: number): void {
    this.loadingDetailSignal.set(true);
    this.examApi.getOne(id).subscribe({
      next: r => {
        this.currentExamSignal.set(r.data || null);
        this.loadingDetailSignal.set(false);
      },
      error: () => {
        this.currentExamSignal.set(null);
        this.loadingDetailSignal.set(false);
      },
    });
  }

  /** Carrega os perfis/tipos de exame usados nos selects de filtro/formulário. */
  loadFormOptions(): void {
    this.profileApi.getAll().subscribe({
      next: r => this.profilesSignal.set(r.data || []),
      error: () => this.notification.error(null, 'Não foi possível carregar os perfis.'),
    });
    this.examTypeApi.getAll().subscribe({
      next: r => this.examTypesSignal.set(r.data || []),
      error: () => this.notification.error(null, 'Não foi possível carregar os tipos de exame.'),
    });
  }

  loadExams(filters?: ExamFilters): void {
    this.loadingSignal.set(true);
    this.examApi.getAll(filters).subscribe({
      next: r => {
        this.examsSignal.set(r.data || []);
        this.loadingSignal.set(false);
      },
      error: err => {
        this.loadingSignal.set(false);
        this.notification.error(err, 'Não foi possível carregar os exames.');
      },
    });
  }

  createExam(payload: object, onSuccess: (examId: number) => void, onError?: () => void): void {
    this.examApi.create(payload).subscribe({
      next: r => {
        this.notification.success('Exame registrado.', 'Salvo!');
        onSuccess(r.data!.id);
      },
      error: err => {
        this.notification.error(err, 'Erro ao salvar.');
        onError?.();
      },
    });
  }

  deleteExam(id: number, onSuccess: () => void, onError?: () => void): void {
    this.examApi.delete(id).subscribe({
      next: () => {
        this.notification.success('Exame excluído.', 'Removido');
        onSuccess();
      },
      error: () => {
        this.notification.error(null, 'Não foi possível excluir.');
        onError?.();
      },
    });
  }
}
