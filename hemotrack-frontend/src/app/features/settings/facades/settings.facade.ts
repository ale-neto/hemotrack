import { Injectable, inject, signal } from '@angular/core';
import { SettingsApiService } from '../services/settings-api.service';
import { ReminderApiService } from '../services/reminder-api.service';
import { ExamTypeApiService } from '@features/exams/services/exam-type-api.service';
import { ProfileApiService } from '@features/profiles/services/profile-api.service';
import { NotificationService } from '@core/services/notification.service';
import { UserSettings } from '../models/settings.model';
import { ExamReminder } from '../models/reminder.model';
import { ExamType } from '@features/exams/models/exam.model';
import { Profile } from '@features/profiles/models/profile.model';

export interface AiSettingsFormValue {
  aiProvider: string | null;
  aiModel: string | null;
  aiApiKey: string | null;
}

/**
 * Única porta de entrada do SettingsComponent. Componente não chama nenhum
 * *ApiService/HttpClient nem se inscreve em Observable algum.
 */
@Injectable({ providedIn: 'root' })
export class SettingsFacade {
  private settingsApi  = inject(SettingsApiService);
  private reminderApi  = inject(ReminderApiService);
  private examTypeApi  = inject(ExamTypeApiService);
  private profileApi   = inject(ProfileApiService);
  private notification = inject(NotificationService);

  private aiSettingsSignal = signal<UserSettings | null>(null);
  private remindersSignal  = signal<ExamReminder[]>([]);
  private examTypesSignal  = signal<ExamType[]>([]);
  private profilesSignal   = signal<Profile[]>([]);

  aiSettings = this.aiSettingsSignal.asReadonly();
  reminders  = this.remindersSignal.asReadonly();
  examTypes  = this.examTypesSignal.asReadonly();
  profiles   = this.profilesSignal.asReadonly();

  loadAll(): void {
    this.settingsApi.get().subscribe({
      next: r => this.aiSettingsSignal.set(r.data || null),
      error: () => this.notification.error(null, 'Não foi possível carregar as configurações.'),
    });
    this.loadReminders();
    this.examTypeApi.getAll().subscribe({
      next: r => this.examTypesSignal.set(r.data || []),
      error: () => this.notification.error(null, 'Não foi possível carregar os tipos de exame.'),
    });
    this.profileApi.getAll().subscribe({
      next: r => this.profilesSignal.set(r.data || []),
      error: () => this.notification.error(null, 'Não foi possível carregar os perfis.'),
    });
  }

  private loadReminders(): void {
    this.reminderApi.getAll().subscribe({
      next: r => this.remindersSignal.set(r.data || []),
      error: () => this.notification.error(null, 'Não foi possível carregar os lembretes.'),
    });
  }

  /**
   * aiApiKey só é reenviado ao backend se o usuário digitou uma chave nova —
   * o placeholder mascarado (bullets, exibido quando já existe uma chave
   * salva) nunca é reenviado nem sobrescreve a chave real no banco.
   */
  saveAi(form: AiSettingsFormValue, onSuccess: () => void, onError?: () => void): void {
    const payload: Record<string, unknown> = {
      aiProvider: form.aiProvider,
      aiModel: form.aiModel || null,
    };
    if (form.aiApiKey && !form.aiApiKey.startsWith('•')) {
      payload['aiApiKey'] = form.aiApiKey;
    }

    this.settingsApi.update(payload).subscribe({
      next: () => {
        this.notification.success('Configurações de IA atualizadas.', 'Salvo!');
        onSuccess();
      },
      error: err => {
        this.notification.error(err, 'Erro ao salvar.');
        onError?.();
      },
    });
  }

  createReminder(payload: object, onSuccess: () => void, onError?: () => void): void {
    this.reminderApi.create(payload).subscribe({
      next: () => {
        this.notification.success('Lembrete configurado.', 'Criado!');
        this.loadReminders();
        onSuccess();
      },
      error: err => {
        this.notification.error(err, 'Erro ao criar.');
        onError?.();
      },
    });
  }

  deleteReminder(id: number): void {
    this.reminderApi.delete(id).subscribe({
      next: () => {
        this.notification.success('Lembrete excluído.', 'Removido');
        this.remindersSignal.update(list => list.filter(r => r.id !== id));
      },
      error: () => this.notification.error(null, 'Não foi possível excluir.'),
    });
  }
}
