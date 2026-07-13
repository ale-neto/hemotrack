import { Component, inject } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { Router, RouterLink } from '@angular/router';
import { MessageService } from 'primeng/api';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { FloatLabelModule } from 'primeng/floatlabel';
import { AuthService } from '../../../core/services/auth.service';
import { SocketService } from '../../../core/services/socket.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [ReactiveFormsModule, RouterLink, ButtonModule, InputTextModule, PasswordModule, FloatLabelModule],
  template: `
    <div class="auth-page">
      <div class="auth-bg">
        <div class="auth-blob blob-1"></div>
        <div class="auth-blob blob-2"></div>
      </div>

      <div class="auth-card fade-in">
        <div class="auth-logo">
          <span class="logo-icon">🩸</span>
          <span class="logo-text">HemoTrack</span>
        </div>
        <h1 class="auth-title">Bem-vindo de volta</h1>
        <p class="auth-subtitle">Faça login para continuar</p>

        <form [formGroup]="form" (ngSubmit)="submit()" class="auth-form">
          <p-floatlabel>
            <input pInputText id="email" formControlName="email" type="email" class="w-full" />
            <label for="email">E-mail</label>
          </p-floatlabel>

          <p-floatlabel>
            <p-password id="password" formControlName="password" [feedback]="false" [toggleMask]="true" styleClass="w-full" inputStyleClass="w-full" />
            <label for="password">Senha</label>
          </p-floatlabel>

          <p-button
            type="submit"
            label="Entrar"
            icon="pi pi-sign-in"
            [loading]="loading"
            [disabled]="form.invalid"
            styleClass="w-full auth-btn"
          />
        </form>

        <p class="auth-footer">
          Não tem conta?
          <a routerLink="/auth/register" class="auth-link">Cadastre-se</a>
        </p>
      </div>
    </div>
  `,
  styles: [`
    .auth-page {
      min-height: 100vh;
      display: flex;
      align-items: center;
      justify-content: center;
      background: var(--ht-bg);
      position: relative;
      overflow: hidden;
    }
    .auth-bg { position: absolute; inset: 0; pointer-events: none; }
    .auth-blob {
      position: absolute;
      border-radius: 50%;
      filter: blur(80px);
      opacity: .15;
    }
    .blob-1 {
      width: 500px; height: 500px;
      background: var(--ht-red);
      top: -100px; left: -100px;
    }
    .blob-2 {
      width: 400px; height: 400px;
      background: #9333ea;
      bottom: -80px; right: -80px;
    }
    .auth-card {
      background: var(--ht-white);
      border: 1px solid var(--ht-border);
      border-radius: 20px;
      box-shadow: var(--shadow-lg);
      padding: 2.5rem;
      width: 100%;
      max-width: 420px;
      position: relative;
      z-index: 1;
    }
    .auth-logo {
      display: flex;
      align-items: center;
      gap: .6rem;
      margin-bottom: 1.5rem;
    }
    .logo-icon { font-size: 1.8rem; }
    .logo-text {
      font-size: 1.4rem;
      font-weight: 700;
      color: var(--ht-text);
      letter-spacing: -.03em;
    }
    .auth-title {
      font-size: 1.5rem;
      font-weight: 700;
      color: var(--ht-text);
      letter-spacing: -.02em;
      margin-bottom: .3rem;
    }
    .auth-subtitle {
      color: var(--ht-text-3);
      font-size: .9rem;
      margin-bottom: 1.75rem;
    }
    .auth-form {
      display: flex;
      flex-direction: column;
      gap: 1.4rem;
    }
    .auth-btn { margin-top: .5rem; height: 44px; font-size: .95rem; }
    .auth-footer {
      text-align: center;
      margin-top: 1.25rem;
      color: var(--ht-text-3);
      font-size: .875rem;
    }
    .auth-link {
      color: var(--ht-red);
      font-weight: 600;
      margin-left: .25rem;
      &:hover { text-decoration: underline; }
    }
  `],
})
export class LoginComponent {
  private fb      = inject(FormBuilder);
  private auth    = inject(AuthService);
  private socket  = inject(SocketService);
  private router  = inject(Router);
  private toast   = inject(MessageService);

  loading = false;

  form = this.fb.group({
    email:    ['', [Validators.required, Validators.email]],
    password: ['', Validators.required],
  });

  submit(): void {
    if (this.form.invalid) return;
    this.loading = true;
    const { email, password } = this.form.value;

    this.auth.login(email!, password!).subscribe({
      next: () => {
        this.socket.connect();
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.loading = false;
        this.toast.add({ severity: 'error', summary: 'Erro', detail: err.error?.error || 'Credenciais inválidas' });
      },
    });
  }
}
