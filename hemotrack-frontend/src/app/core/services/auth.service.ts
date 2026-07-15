import { Injectable, inject, signal, computed } from '@angular/core';
import { Router } from '@angular/router';
import { tap } from 'rxjs/operators';
import { Observable } from 'rxjs';
import { AuthApiService } from '@features/auth/services/auth-api.service';
import { AuthResponse, User } from '@features/auth/models/auth.model';

/**
 * Atua como a "facade" da sessão de autenticação: expõe Signals (token/user/isAuth)
 * para o resto da app consumir, e delega as chamadas HTTP para AuthApiService.
 * Fica em core/ (não em features/auth/) porque guards, o interceptor e
 * praticamente toda a árvore de componentes autenticados dependem dela —
 * é um serviço verdadeiramente global, não específico da feature de login/registro.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly TOKEN_KEY = 'ht_token';
  private readonly USER_KEY  = 'ht_user';

  private authApi = inject(AuthApiService);
  private router  = inject(Router);

  readonly token  = signal<string | null>(localStorage.getItem(this.TOKEN_KEY));
  readonly user   = signal<User | null>(this._loadUser());
  readonly isAuth = computed(() => !!this.token());

  login(email: string, password: string): Observable<AuthResponse> {
    return this.authApi.login(email, password).pipe(tap(res => this._persist(res)));
  }

  register(name: string, email: string, password: string): Observable<AuthResponse> {
    return this.authApi.register(name, email, password).pipe(tap(res => this._persist(res)));
  }

  logout(): void {
    localStorage.removeItem(this.TOKEN_KEY);
    localStorage.removeItem(this.USER_KEY);
    this.token.set(null);
    this.user.set(null);
    this.router.navigate(['/auth/login']);
  }

  private _persist(res: AuthResponse): void {
    localStorage.setItem(this.TOKEN_KEY, res.token);
    localStorage.setItem(this.USER_KEY, JSON.stringify(res.user));
    this.token.set(res.token);
    this.user.set(res.user);
  }

  private _loadUser(): User | null {
    const raw = localStorage.getItem(this.USER_KEY);
    return raw ? JSON.parse(raw) : null;
  }
}
