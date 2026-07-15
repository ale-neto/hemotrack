import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api.model';
import { BloodExam } from '../models/exam.model';

const API = environment.apiUrl;

export interface ExamFilters {
  profileId?: number;
  examTypeId?: number;
  startDate?: string;
  endDate?: string;
}

/** Só HTTP — nenhuma regra de negócio aqui (fica na ExamsFacade). */
@Injectable({ providedIn: 'root' })
export class ExamApiService {
  private http = inject(HttpClient);

  getAll(filters?: ExamFilters): Observable<ApiResponse<BloodExam[]>> {
    let params = new HttpParams();
    if (filters?.profileId)  params = params.set('profileId',  filters.profileId);
    if (filters?.examTypeId) params = params.set('examTypeId', filters.examTypeId);
    if (filters?.startDate)  params = params.set('startDate',  filters.startDate);
    if (filters?.endDate)    params = params.set('endDate',    filters.endDate);
    return this.http.get<ApiResponse<BloodExam[]>>(`${API}/exams`, { params });
  }

  getOne(id: number): Observable<ApiResponse<BloodExam>> {
    return this.http.get<ApiResponse<BloodExam>>(`${API}/exams/${id}`);
  }

  create(data: object): Observable<ApiResponse<BloodExam>> {
    return this.http.post<ApiResponse<BloodExam>>(`${API}/exams`, data);
  }

  /** Antes chamado via HttpClient direto no exam-form.component.ts, bypassando esta camada. */
  uploadPdf(profileId: number, file: File): Observable<ApiResponse<BloodExam>> {
    const formData = new FormData();
    formData.append('pdf', file);
    formData.append('profileId', String(profileId));
    return this.http.post<ApiResponse<BloodExam>>(`${API}/exams/upload-pdf`, formData);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${API}/exams/${id}`);
  }
}
