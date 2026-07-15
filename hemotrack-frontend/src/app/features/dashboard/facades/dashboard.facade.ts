import { Injectable, inject, computed } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { forkJoin, of } from 'rxjs';
import { map, catchError } from 'rxjs/operators';
import { ExamApiService } from '@features/exams/services/exam-api.service';
import { ReminderApiService } from '@features/settings/services/reminder-api.service';
import { ProfileApiService } from '@features/profiles/services/profile-api.service';
import { BloodExam } from '@features/exams/models/exam.model';
import { ExamReminder } from '@features/settings/models/reminder.model';
import { Profile } from '@features/profiles/models/profile.model';

const THIRTY_DAYS_MS = 30 * 24 * 60 * 60 * 1000;

/**
 * Única porta de entrada do DashboardComponent para os dados. Combina exames,
 * lembretes e perfis (três domínios de outras features) via forkJoin — no
 * lugar do contador manual (`let pending = 3`) que existia no componente — e
 * expõe tudo como Signals, incluindo os agrupamentos derivados (recentes,
 * vencidos, próximos 30 dias) que antes eram calculados no próprio componente.
 */
@Injectable({ providedIn: 'root' })
export class DashboardFacade {
  private examApi     = inject(ExamApiService);
  private reminderApi = inject(ReminderApiService);
  private profileApi  = inject(ProfileApiService);

  private data = toSignal(
    forkJoin({
      exams: this.examApi.getAll().pipe(
        map(r => r.data || []),
        catchError(() => of<BloodExam[]>([])),
      ),
      reminders: this.reminderApi.getAll().pipe(
        map(r => r.data || []),
        catchError(() => of<ExamReminder[]>([])),
      ),
      profiles: this.profileApi.getAll().pipe(
        map(r => r.data || []),
        catchError(() => of<Profile[]>([])),
      ),
    }),
    { initialValue: null },
  );

  loading   = computed(() => this.data() === null);
  exams     = computed(() => this.data()?.exams ?? []);
  reminders = computed(() => this.data()?.reminders ?? []);
  profiles  = computed(() => this.data()?.profiles ?? []);

  recentExams = computed(() => this.exams().slice(0, 5));

  overdueReminders = computed(() => this.reminders().filter(r => r.isOverdue));

  upcomingReminders = computed(() => {
    const now = new Date();
    const in30Days = new Date(now.getTime() + THIRTY_DAYS_MS);
    return this.reminders().filter(r => {
      if (!r.nextDueDate || r.isOverdue) return false;
      const due = new Date(r.nextDueDate);
      return due >= now && due <= in30Days;
    });
  });

  sortedReminders = computed(() => [...this.reminders()].sort((a, b) => (a.isOverdue ? -1 : 1)));
}
