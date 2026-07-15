import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { ApiResponse } from '@core/models/api.model';
import { Profile } from '../models/profile.model';

const API = environment.apiUrl;

/** Só HTTP — nenhuma regra de negócio aqui (fica na ProfilesFacade). */
@Injectable({ providedIn: 'root' })
export class ProfileApiService {
  private http = inject(HttpClient);

  getAll(): Observable<ApiResponse<Profile[]>> {
    return this.http.get<ApiResponse<Profile[]>>(`${API}/profiles`);
  }
  create(data: object): Observable<ApiResponse<Profile>> {
    return this.http.post<ApiResponse<Profile>>(`${API}/profiles`, data);
  }
  update(id: number, data: object): Observable<ApiResponse<Profile>> {
    return this.http.put<ApiResponse<Profile>>(`${API}/profiles/${id}`, data);
  }
  delete(id: number): Observable<ApiResponse<void>> {
    return this.http.delete<ApiResponse<void>>(`${API}/profiles/${id}`);
  }
}
