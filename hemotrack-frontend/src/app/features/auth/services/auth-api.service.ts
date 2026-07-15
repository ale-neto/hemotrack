import { Injectable, inject } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '@env/environment';
import { AuthResponse } from '../models/auth.model';

const API = environment.apiUrl;

/**
 * Só HTTP — nenhum estado de sessão aqui. A gestão de sessão (token/user em
 * signal, persistência em localStorage) continua em core/services/auth.service.ts,
 * que é quem os guards/interceptor/app inteira consomem; este service existe só
 * para isolar as duas chamadas HTTP cruas por trás de uma interface própria.
 */
@Injectable({ providedIn: 'root' })
export class AuthApiService {
  private http = inject(HttpClient);

  login(email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/login`, { email, password });
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.http.post<AuthResponse>(`${API}/auth/register`, { name, email, password });
  }
}
