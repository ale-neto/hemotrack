import { Injectable, inject, signal } from '@angular/core';
import { ReportApiService } from '../services/report-api.service';
import { ProfileApiService } from '@features/profiles/services/profile-api.service';
import { ExamTypeApiService } from '@features/exams/services/exam-type-api.service';
import { NotificationService } from '@core/services/notification.service';
import { ReportData } from '../models/report.model';
import { ExamType } from '@features/exams/models/exam.model';
import { Profile } from '@features/profiles/models/profile.model';

/**
 * Única porta de entrada do ReportsComponent. Componente não chama
 * ReportApiService/HttpClient/fetch nem se inscreve em Observable algum —
 * inclusive o export de PDF (antes um fetch() cru reimplementando o header
 * de auth na mão) passa por aqui agora.
 */
@Injectable({ providedIn: 'root' })
export class ReportsFacade {
  private reportApi   = inject(ReportApiService);
  private profileApi  = inject(ProfileApiService);
  private examTypeApi = inject(ExamTypeApiService);
  private notification = inject(NotificationService);

  private profilesSignal   = signal<Profile[]>([]);
  private examTypesSignal  = signal<ExamType[]>([]);
  private reportDataSignal = signal<ReportData | null>(null);
  private aiAnalysisSignal = signal<string | null>(null);

  private loadingSignal          = signal(false);
  private loadingExamTypesSignal = signal(false);
  private analyzingSignal        = signal(false);

  profiles   = this.profilesSignal.asReadonly();
  examTypes  = this.examTypesSignal.asReadonly();
  reportData = this.reportDataSignal.asReadonly();
  aiAnalysis = this.aiAnalysisSignal.asReadonly();

  loading          = this.loadingSignal.asReadonly();
  loadingExamTypes = this.loadingExamTypesSignal.asReadonly();
  analyzing        = this.analyzingSignal.asReadonly();

  loadProfiles(): void {
    this.profileApi.getAll().subscribe({
      next: r => this.profilesSignal.set(r.data || []),
      error: () => this.notification.error(null, 'Não foi possível carregar os perfis.'),
    });
  }

  /** Retorna a lista carregada via callback, pois o componente precisa validar a seleção atual contra ela. */
  loadExamTypes(profileId: number | undefined, onLoaded: (examTypes: ExamType[]) => void): void {
    this.loadingExamTypesSignal.set(true);
    this.examTypeApi.getWithExams(profileId).subscribe({
      next: r => {
        const examTypes = r.data || [];
        this.examTypesSignal.set(examTypes);
        this.loadingExamTypesSignal.set(false);
        onLoaded(examTypes);
      },
      error: () => {
        this.loadingExamTypesSignal.set(false);
        this.notification.error(null, 'Não foi possível carregar os tipos de exame.');
      },
    });
  }

  clearReport(): void {
    this.reportDataSignal.set(null);
    this.aiAnalysisSignal.set(null);
  }

  load(examTypeId: number, profileId: number | undefined, onLoaded: (data: ReportData | null) => void): void {
    this.loadingSignal.set(true);
    this.aiAnalysisSignal.set(null);

    this.reportApi.getReport(examTypeId, profileId).subscribe({
      next: r => {
        const data = r.data || null;
        this.reportDataSignal.set(data);
        this.loadingSignal.set(false);
        onLoaded(data);
      },
      error: () => {
        this.loadingSignal.set(false);
        this.notification.error(null, 'Não foi possível carregar o relatório.');
      },
    });
  }

  analyze(examTypeId: number, profileId: number): void {
    this.analyzingSignal.set(true);
    this.reportApi.analyze(examTypeId, profileId).subscribe({
      next: r => {
        this.aiAnalysisSignal.set(r.data?.analysis || null);
        this.analyzingSignal.set(false);
      },
      error: err => {
        this.analyzingSignal.set(false);
        this.notification.error(err, 'Não foi possível gerar a análise de IA.', 'Erro na análise');
      },
    });
  }

  downloadPdf(examTypeId: number, profileId: number, onSuccess: (blob: Blob) => void): void {
    this.reportApi.downloadPdf(examTypeId, profileId, this.aiAnalysisSignal()).subscribe({
      next: blob => onSuccess(blob),
      error: () => this.notification.error(null, 'Não foi possível gerar o PDF do relatório.'),
    });
  }
}
