import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api.model';
import { ReportData } from '../models/report.model';

const API = environment.apiUrl;

/** Só HTTP — nenhuma regra de negócio aqui (fica na ReportsFacade). */
@Injectable({ providedIn: 'root' })
export class ReportApiService {
  private http = inject(HttpClient);

  getReport(examTypeId: number, profileId?: number): Observable<ApiResponse<ReportData>> {
    let params = new HttpParams();
    if (profileId) params = params.set('profileId', profileId);
    return this.http.get<ApiResponse<ReportData>>(`${API}/reports/${examTypeId}`, { params });
  }

  analyze(examTypeId: number, profileId: number): Observable<ApiResponse<{ analysis: string }>> {
    return this.http.post<ApiResponse<{ analysis: string }>>(`${API}/reports/${examTypeId}/analyze`, { profileId });
  }

  /**
   * Antes feito via fetch() cru no reports.component.ts, reimplementando a
   * anexação manual do header de Authorization (que o authInterceptor já faz
   * para toda chamada via HttpClient).
   */
  downloadPdf(examTypeId: number, profileId: number, analysis?: string | null): Observable<Blob> {
    let params = new HttpParams().set('profileId', profileId);
    if (analysis) params = params.set('analysis', analysis);
    return this.http.get(`${API}/reports/${examTypeId}/pdf`, { params, responseType: 'blob' });
  }
}
