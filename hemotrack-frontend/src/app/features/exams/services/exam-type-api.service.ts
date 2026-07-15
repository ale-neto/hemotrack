import { Injectable, inject } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api.model';
import { ExamType } from '../models/exam.model';

const API = environment.apiUrl;

/** Só HTTP — nenhuma regra de negócio aqui. */
@Injectable({ providedIn: 'root' })
export class ExamTypeApiService {
  private http = inject(HttpClient);

  getAll(): Observable<ApiResponse<ExamType[]>> {
    return this.http.get<ApiResponse<ExamType[]>>(`${API}/exam-types`);
  }

  getWithExams(profileId?: number): Observable<ApiResponse<ExamType[]>> {
    let params = new HttpParams();
    if (profileId) params = params.set('profileId', profileId);
    return this.http.get<ApiResponse<ExamType[]>>(`${API}/exam-types`, { params });
  }

  create(data: Partial<ExamType>): Observable<ApiResponse<ExamType>> {
    return this.http.post<ApiResponse<ExamType>>(`${API}/exam-types`, data);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${API}/exam-types/${id}`);
  }
}
