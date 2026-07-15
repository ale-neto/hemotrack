import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api.model';
import { ExamReminder } from '../models/reminder.model';

const API = environment.apiUrl;

/** Só HTTP — nenhuma regra de negócio aqui. */
@Injectable({ providedIn: 'root' })
export class ReminderApiService {
  private http = inject(HttpClient);

  getAll(): Observable<ApiResponse<ExamReminder[]>> {
    return this.http.get<ApiResponse<ExamReminder[]>>(`${API}/reminders`);
  }
  create(data: Partial<ExamReminder>): Observable<ApiResponse<ExamReminder>> {
    return this.http.post<ApiResponse<ExamReminder>>(`${API}/reminders`, data);
  }
  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${API}/reminders/${id}`);
  }
}
