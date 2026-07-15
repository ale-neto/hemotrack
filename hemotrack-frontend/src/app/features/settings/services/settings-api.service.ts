import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api.model';
import { UserSettings } from '../models/settings.model';

const API = environment.apiUrl;

/** Só HTTP — nenhuma regra de negócio aqui (fica na SettingsFacade). */
@Injectable({ providedIn: 'root' })
export class SettingsApiService {
  private http = inject(HttpClient);

  get(): Observable<ApiResponse<UserSettings>> {
    return this.http.get<ApiResponse<UserSettings>>(`${API}/settings`);
  }
  update(data: Partial<UserSettings>): Observable<ApiResponse<UserSettings>> {
    return this.http.put<ApiResponse<UserSettings>>(`${API}/settings`, data);
  }
}
