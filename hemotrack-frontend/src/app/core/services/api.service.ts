import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  ApiResponse, BloodExam, ExamType, ExamReminder,
  Profile, UserSettings, ReportData
} from '../models';

const API = environment.apiUrl;

// ── Profiles ──────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ProfileService {
  constructor(private http: HttpClient) {}

  getAll(): Observable<ApiResponse<Profile[]>> {
    return this.http.get<ApiResponse<Profile[]>>(`${API}/profiles`);
  }
  create(data: Partial<Profile>): Observable<ApiResponse<Profile>> {
    return this.http.post<ApiResponse<Profile>>(`${API}/profiles`, data);
  }
  update(id: number, data: Partial<Profile>): Observable<ApiResponse<Profile>> {
    return this.http.put<ApiResponse<Profile>>(`${API}/profiles/${id}`, data);
  }
  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${API}/profiles/${id}`);
  }
}

// ── Exams ─────────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ExamService {
  constructor(private http: HttpClient) {}

  getAll(filters?: { profileId?: number; examTypeId?: number; startDate?: string; endDate?: string }): Observable<ApiResponse<BloodExam[]>> {
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

  create(data: FormData | object): Observable<ApiResponse<BloodExam>> {
    return this.http.post<ApiResponse<BloodExam>>(`${API}/exams`, data);
  }

  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${API}/exams/${id}`);
  }
}

// ── Exam Types ────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ExamTypeService {
  constructor(private http: HttpClient) {}

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

// ── Reports ───────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ReportService {
  constructor(private http: HttpClient) {}

  getReport(examTypeId: number, profileId?: number): Observable<ApiResponse<ReportData>> {
    let params = new HttpParams();
    if (profileId) params = params.set('profileId', profileId);
    return this.http.get<ApiResponse<ReportData>>(`${API}/reports/${examTypeId}`, { params });
  }

  analyze(examTypeId: number, profileId: number): Observable<ApiResponse<{ analysis: string }>> {
    return this.http.post<ApiResponse<{ analysis: string }>>(`${API}/reports/${examTypeId}/analyze`, { profileId });
  }
}

// ── Settings ──────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class SettingsService {
  constructor(private http: HttpClient) {}

  get(): Observable<ApiResponse<UserSettings>> {
    return this.http.get<ApiResponse<UserSettings>>(`${API}/settings`);
  }
  update(data: Partial<UserSettings>): Observable<ApiResponse<UserSettings>> {
    return this.http.put<ApiResponse<UserSettings>>(`${API}/settings`, data);
  }
}

// ── Reminders ─────────────────────────────────────────────────────────────────
@Injectable({ providedIn: 'root' })
export class ReminderService {
  constructor(private http: HttpClient) {}

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
