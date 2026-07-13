import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { CardModule } from 'primeng/card';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { ExamService, ReminderService, ProfileService } from '../../core/services/api.service';
import { AuthService } from '../../core/services/auth.service';
import { BloodExam, ExamReminder, Profile } from '../../core/models';

@Component({
  selector: 'app-dashboard',
  standalone: true,
  imports: [RouterLink, DatePipe, ButtonModule, CardModule, TagModule, SkeletonModule],
  template: `
    <div class="dashboard fade-in">
      <!-- Header -->
      <div class="dash-header">
        <div>
          <h1 class="page-title">Olá, {{ firstName() }}</h1>
          <p class="dash-subtitle">Aqui está um resumo da sua saúde</p>
        </div>
        <a routerLink="/exams/new">
          <p-button label="Novo Exame" icon="pi pi-plus" />
        </a>
      </div>

      <!-- Stats cards -->
      <div class="stats-grid">
        @if (loading()) {
          @for (i of [1,2,3,4]; track i) {
            <div class="stat-card">
              <p-skeleton height="80px" borderRadius="12px" />
            </div>
          }
        } @else {
          <div class="stat-card">
            <div class="stat-icon stat-blue"><i class="pi pi-file-edit"></i></div>
            <div>
              <div class="stat-value">{{ exams().length }}</div>
              <div class="stat-label">Total de exames</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-green"><i class="pi pi-users"></i></div>
            <div>
              <div class="stat-value">{{ profiles().length }}</div>
              <div class="stat-label">Perfis cadastrados</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-orange"><i class="pi pi-bell"></i></div>
            <div>
              <div class="stat-value">{{ overdueReminders().length }}</div>
              <div class="stat-label">Lembretes vencidos</div>
            </div>
          </div>
          <div class="stat-card">
            <div class="stat-icon stat-red"><i class="pi pi-calendar"></i></div>
            <div>
              <div class="stat-value">{{ upcomingReminders().length }}</div>
              <div class="stat-label">Próximos 30 dias</div>
            </div>
          </div>
        }
      </div>

      <div class="dash-grid">
        <!-- Recent exams -->
        <div class="card">
          <div class="flex items-center justify-between" style="margin-bottom:1rem">
            <h2 class="section-title">Exames recentes</h2>
            <a routerLink="/exams">
              <p-button label="Ver todos" size="small" [text]="true" icon="pi pi-arrow-right" iconPos="right" />
            </a>
          </div>

          @if (loading()) {
            @for (i of [1,2,3]; track i) {
              <p-skeleton height="52px" borderRadius="8px" styleClass="mb-2" />
            }
          } @else if (recentExams().length === 0) {
            <div class="empty-state">
              <i class="pi pi-file-edit empty-icon"></i>
              <p>Nenhum exame ainda.</p>
              <a routerLink="/exams/new">
                <p-button label="Adicionar primeiro exame" size="small" />
              </a>
            </div>
          } @else {
            <div class="exam-list">
              @for (exam of recentExams(); track exam.id) {
                <a [routerLink]="['/exams', exam.id]" class="exam-row">
                  <div class="exam-row-left">
                    <div class="exam-dot" [class.dot-manual]="exam.origin === 'manual'" [class.dot-pdf]="exam.origin === 'pdf_extracted'"></div>
                    <div>
                      <div class="exam-name">{{ exam.ExamType?.name }}</div>
                      <div class="exam-meta">{{ exam.examDate | date:'dd/MM/yyyy' }} · {{ exam.labName || 'Laboratório não informado' }}</div>
                    </div>
                  </div>
                  <p-tag
                    [value]="exam.origin === 'pdf_extracted' ? 'PDF' : 'Manual'"
                    [severity]="exam.origin === 'pdf_extracted' ? 'info' : 'secondary'"
                  />
                </a>
              }
            </div>
          }
        </div>

        <!-- Reminders -->
        <div class="card">
          <div class="flex items-center justify-between" style="margin-bottom:1rem">
            <h2 class="section-title">Lembretes</h2>
            <a routerLink="/settings">
              <p-button label="Gerenciar" size="small" [text]="true" icon="pi pi-cog" iconPos="right" />
            </a>
          </div>

          @if (loading()) {
            @for (i of [1,2]; track i) {
              <p-skeleton height="52px" borderRadius="8px" styleClass="mb-2" />
            }
          } @else if (reminders().length === 0) {
            <div class="empty-state">
              <i class="pi pi-bell empty-icon"></i>
              <p>Nenhum lembrete configurado.</p>
            </div>
          } @else {
            <div class="reminder-list">
              @for (r of sortedReminders(); track r.id) {
                <div class="reminder-row" [class.overdue]="r.isOverdue">
                  <div class="reminder-left">
                    <div class="reminder-indicator" [class.overdue-ind]="r.isOverdue" [class.ok-ind]="!r.isOverdue"></div>
                    <div>
                      <div class="reminder-name">{{ r.ExamType?.name }}</div>
                      <div class="reminder-meta">
                        {{ r.UserProfile?.name }} ·
                        @if (r.nextDueDate) {
                          Vence {{ r.nextDueDate | date:'dd/MM/yyyy' }}
                        } @else {
                          Sem data base
                        }
                      </div>
                    </div>
                  </div>
                  @if (r.isOverdue) {
                    <p-tag value="Vencido" severity="danger" />
                  } @else {
                    <p-tag value="OK" severity="success" />
                  }
                </div>
              }
            </div>
          }
        </div>
      </div>
    </div>
  `,
  styles: [`

    .dash-header {
      display: flex;
      align-items: flex-start;
      justify-content: space-between;
      margin-bottom: 1.75rem;
      flex-wrap: wrap;
      gap: 1rem;
    }

    .dash-subtitle { color: var(--ht-text-3); margin-top: .25rem; }

    /* Stats */
    .stats-grid {
      display: grid;
      grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
      gap: 1rem;
      margin-bottom: 1.5rem;
    }

    .stat-card {
      background: var(--ht-white);
      border: 1px solid var(--ht-border);
      border-radius: var(--radius);
      padding: 1.25rem;
      display: flex;
      align-items: center;
      gap: 1rem;
      box-shadow: var(--shadow-sm);
    }

    .stat-icon {
      width: 44px; height: 44px; border-radius: 10px;
      display: flex; align-items: center; justify-content: center;
      font-size: 1.1rem; flex-shrink: 0;
    }

    .stat-blue   { background: #dbeafe; color: #2563eb; }
    .stat-green  { background: var(--ht-ok-light); color: var(--ht-ok); }
    .stat-orange { background: var(--ht-warn-light); color: var(--ht-warn); }
    .stat-red    { background: var(--ht-red-muted); color: var(--ht-red); }

    .stat-value  { font-size: 1.6rem; font-weight: 700; line-height: 1; color: var(--ht-text); font-family: var(--font-mono); }
    .stat-label  { font-size: .75rem; color: var(--ht-text-3); margin-top: .2rem; }

    /* Two-col grid */
    .dash-grid {
      display: grid;
      grid-template-columns: 1fr 1fr;
      gap: 1.25rem;
    }

    @media (max-width: 800px) { .dash-grid { grid-template-columns: 1fr; } }

    /* Exam list */
    .exam-list { display: flex; flex-direction: column; gap: 2px; }

    .exam-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: .7rem .5rem; border-radius: var(--radius-sm); cursor: pointer;
      text-decoration: none; color: inherit;
      transition: background var(--transition);
      &:hover { background: var(--ht-off-white); }
    }

    .exam-row-left { display: flex; align-items: center; gap: .75rem; }

    .exam-dot {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .dot-manual { background: var(--ht-text-3); }
    .dot-pdf    { background: var(--ht-low); }

    .exam-name  { font-size: .875rem; font-weight: 500; color: var(--ht-text); }
    .exam-meta  { font-size: .75rem; color: var(--ht-text-3); }

    /* Reminder list */
    .reminder-list { display: flex; flex-direction: column; gap: 2px; }

    .reminder-row {
      display: flex; align-items: center; justify-content: space-between;
      padding: .7rem .5rem; border-radius: var(--radius-sm);
      &.overdue { background: var(--ht-high-light); }
    }

    .reminder-left { display: flex; align-items: center; gap: .75rem; }

    .reminder-indicator {
      width: 8px; height: 8px; border-radius: 50%; flex-shrink: 0;
    }
    .overdue-ind { background: var(--ht-high); animation: pulse-dot 1.5s infinite; }
    .ok-ind      { background: var(--ht-ok); }

    .reminder-name { font-size: .875rem; font-weight: 500; color: var(--ht-text); }
    .reminder-meta { font-size: .75rem; color: var(--ht-text-3); }

    /* Empty */
    .empty-state {
      text-align: center; padding: 2rem 1rem;
      color: var(--ht-text-3); display: flex; flex-direction: column; align-items: center; gap: .75rem;
    }
    .empty-icon { font-size: 2rem; opacity: .4; }
  `],
})
export class DashboardComponent implements OnInit {
  private examSvc     = inject(ExamService);
  private reminderSvc = inject(ReminderService);
  private profileSvc  = inject(ProfileService);
  auth                = inject(AuthService);

  loading   = signal(true);
  exams     = signal<BloodExam[]>([]);
  reminders = signal<ExamReminder[]>([]);
  profiles  = signal<Profile[]>([]);

  firstName  = () => this.auth.user()?.name?.split(' ')[0] || '';
  recentExams = () => this.exams().slice(0, 5);
  overdueReminders = () => this.reminders().filter(r => r.isOverdue);
  upcomingReminders = () => {
    const now = new Date();
    const in30 = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);
    return this.reminders().filter(r => {
      if (!r.nextDueDate || r.isOverdue) return false;
      const d = new Date(r.nextDueDate);
      return d >= now && d <= in30;
    });
  };
  sortedReminders = () => [...this.reminders()].sort((a, b) => (a.isOverdue ? -1 : 1));

  ngOnInit(): void {
    let pending = 3;
    const done = () => { if (--pending === 0) this.loading.set(false); };

    this.examSvc.getAll().subscribe({ next: r => { this.exams.set(r.data || []); done(); }, error: done });
    this.reminderSvc.getAll().subscribe({ next: r => { this.reminders.set(r.data || []); done(); }, error: done });
    this.profileSvc.getAll().subscribe({ next: r => { this.profiles.set(r.data || []); done(); }, error: done });
  }
}
