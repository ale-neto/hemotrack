import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule, FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { InputTextModule } from 'primeng/inputtext';
import { PasswordModule } from 'primeng/password';
import { SelectModule } from 'primeng/select';
import { FloatLabelModule } from 'primeng/floatlabel';
import { Accordion, AccordionPanel, AccordionHeader, AccordionContent } from 'primeng/accordion';
import { DialogModule } from 'primeng/dialog';
import { InputNumberModule } from 'primeng/inputnumber';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { SettingsService, ReminderService, ExamTypeService, ProfileService } from '../../core/services/api.service';
import { UserSettings, ExamReminder, ExamType, Profile } from '../../core/models';

const AI_PROVIDERS = [
  { label: 'Gemini (Google)', value: 'gemini' },
  { label: 'OpenAI (ChatGPT)', value: 'openai' },
  { label: 'Claude (Anthropic)', value: 'claude' },
];

const AI_MODELS: Record<string, { label: string; value: string }[]> = {
  gemini: [
    { label: 'Gemini 1.5 Flash (rápido, grátis)', value: 'gemini-2.5-flash' },
    { label: 'Gemini 1.5 Pro (avançado)', value: 'gemini-2.5-pro' },
  ],
  openai: [
    { label: 'GPT-4o Mini (econômico)', value: 'gpt-4o-mini' },
    { label: 'GPT-4o (avançado)', value: 'gpt-4o' },
  ],
  claude: [
    { label: 'Claude 3 Haiku (rápido)', value: 'claude-3-haiku-20240307' },
    { label: 'Claude 3.5 Sonnet (avançado)', value: 'claude-sonnet-4-6' },
  ],
};

@Component({
  selector: 'app-settings',
  standalone: true,
  imports: [ReactiveFormsModule, FormsModule, ButtonModule, InputTextModule, PasswordModule,
    SelectModule, FloatLabelModule, Accordion, AccordionPanel, AccordionHeader, AccordionContent, DialogModule, InputNumberModule, TagModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  template: `
    <div class="fade-in" style="max-width:700px">
      <p-confirmDialog />

      <h1 class="page-title" style="margin-bottom:1.5rem">Configurações</h1>

      <p-accordion [multiple]="true">

        <!-- ── AI Settings ── -->
        <p-accordion-panel value="ai">
          <p-accordion-header>🤖 Inteligência Artificial</p-accordion-header>
          <p-accordion-content>
            <form [formGroup]="aiForm" (ngSubmit)="saveAi()" class="settings-form">
              <p class="settings-hint">
                Configure sua API Key para habilitar a extração automática de PDFs e análise de exames.
              </p>

              <div class="form-row">
                <p-floatlabel class="flex-1">
                  <p-select
                    id="aiProvider"
                    formControlName="aiProvider"
                    [options]="aiProviders"
                    optionLabel="label"
                    optionValue="value"
                    styleClass="w-full"
                    (onChange)="onProviderChange()"
                  />
                  <label for="aiProvider">Provider</label>
                </p-floatlabel>

                <p-floatlabel class="flex-1">
                  <p-select
                    id="aiModel"
                    formControlName="aiModel"
                    [options]="availableModels()"
                    optionLabel="label"
                    optionValue="value"
                    styleClass="w-full"
                  />
                  <label for="aiModel">Modelo</label>
                </p-floatlabel>
              </div>

              <p-floatlabel>
                <p-password
                  id="aiApiKey"
                  formControlName="aiApiKey"
                  [feedback]="false"
                  [toggleMask]="true"
                  styleClass="w-full"
                  inputStyleClass="w-full"
                  placeholder="sk-... ou AIza..."
                />
                <label for="aiApiKey">API Key</label>
              </p-floatlabel>

              <div class="api-key-links">
                <a href="https://aistudio.google.com/app/apikey" target="_blank">🔑 Gemini (grátis)</a>
                <a href="https://platform.openai.com/api-keys" target="_blank">🔑 OpenAI</a>
                <a href="https://console.anthropic.com/settings/keys" target="_blank">🔑 Claude</a>
              </div>

              <p-button type="submit" label="Salvar configurações de IA" icon="pi pi-check" [loading]="savingAi()" />
            </form>
          </p-accordion-content>
        </p-accordion-panel>

        <!-- ── Reminders ── -->
        <p-accordion-panel value="reminders">
          <p-accordion-header>🔔 Lembretes de Exames</p-accordion-header>
          <p-accordion-content>
            <div class="settings-section">
              <div class="flex items-center justify-between" style="margin-bottom:1rem">
                <p class="settings-hint" style="margin:0">Configure lembretes periódicos para não esquecer de refazer seus exames.</p>
                <p-button label="Novo lembrete" icon="pi pi-plus" size="small" (onClick)="openReminderForm()" />
              </div>

              @if (reminders().length === 0) {
                <p style="color:var(--ht-text-3); font-size:.875rem; text-align:center; padding:1.5rem 0">
                  Nenhum lembrete configurado.
                </p>
              } @else {
                <div class="reminders-list">
                  @for (r of reminders(); track r.id) {
                    <div class="reminder-item" [class.overdue]="r.isOverdue">
                      <div class="reminder-info">
                        <div class="reminder-name">{{ r.ExamType?.name }}</div>
                        <div class="reminder-meta">
                          {{ r.UserProfile?.name }} · a cada {{ r.intervalMonths }} mês(es)
                          @if (r.nextDueDate) {
                            · próximo: {{ r.nextDueDate }}
                          }
                        </div>
                      </div>
                      <div class="flex items-center gap-1">
                        @if (r.isOverdue) {
                          <p-tag value="Vencido" severity="danger" />
                        }
                        <p-button icon="pi pi-trash" [text]="true" severity="danger" size="small" (onClick)="deleteReminder(r)" />
                      </div>
                    </div>
                  }
                </div>
              }
            </div>
          </p-accordion-content>
        </p-accordion-panel>

      </p-accordion>

      <!-- Reminder Dialog -->
      <p-dialog
        [(visible)]="showReminderDialog"
        header="Novo Lembrete"
        [modal]="true"
        [style]="{ width: '480px' }"
        [draggable]="false"
        appendTo="body"
      >
        <form [formGroup]="reminderForm" (ngSubmit)="saveReminder()" class="settings-form">
          <p-floatlabel>
            <p-select
              id="reminderProfile"
              formControlName="profileId"
              [options]="profiles()"
              optionLabel="name"
              optionValue="id"
              styleClass="w-full"
            />
            <label for="reminderProfile">Perfil *</label>
          </p-floatlabel>

          <p-floatlabel>
            <p-select
              id="reminderExamType"
              formControlName="examTypeId"
              [options]="examTypes()"
              optionLabel="name"
              optionValue="id"
              styleClass="w-full"
            />
            <label for="reminderExamType">Tipo de exame *</label>
          </p-floatlabel>

          <p-floatlabel>
            <p-inputnumber
              id="interval"
              formControlName="intervalMonths"
              [min]="1"
              [max]="24"
              suffix=" meses"
              styleClass="w-full"
              inputStyleClass="w-full"
            />
            <label for="interval">Intervalo *</label>
          </p-floatlabel>

          <div style="display:flex; justify-content:flex-end; gap:.5rem">
            <p-button label="Cancelar" [outlined]="true" type="button" (onClick)="showReminderDialog = false" />
            <p-button label="Criar" icon="pi pi-check" type="submit" [loading]="savingReminder()" [disabled]="reminderForm.invalid" />
          </div>
        </form>
      </p-dialog>
    </div>
  `,
  styles: [`
    .settings-form { display: flex; flex-direction: column; gap: 1.25rem; padding: .25rem 0; }
    .settings-hint { color: var(--ht-text-3); font-size: .875rem; line-height: 1.5; }
    .form-row { display: flex; gap: 1rem; flex-wrap: wrap; > * { min-width: 180px; } }

    .api-key-links {
      display: flex; gap: 1.5rem; flex-wrap: wrap;
      a { color: var(--ht-red); font-size: .8rem; font-weight: 500; &:hover { text-decoration: underline; } }
    }

    .settings-section {}

    .reminders-list { display: flex; flex-direction: column; gap: .5rem; }

    .reminder-item {
      display: flex; align-items: center; justify-content: space-between;
      padding: .75rem; border-radius: var(--radius-sm);
      border: 1px solid var(--ht-border); background: var(--ht-white);
      &.overdue { border-color: var(--ht-high); background: var(--ht-high-light); }
    }

    .reminder-info {}
    .reminder-name { font-size: .875rem; font-weight: 500; color: var(--ht-text); }
    .reminder-meta { font-size: .75rem; color: var(--ht-text-3); margin-top: .1rem; }
  `],
})
export class SettingsComponent implements OnInit {
  private settingsSvc  = inject(SettingsService);
  private reminderSvc  = inject(ReminderService);
  private examTypeSvc  = inject(ExamTypeService);
  private profileSvc   = inject(ProfileService);
  private confirm      = inject(ConfirmationService);
  private toast        = inject(MessageService);
  private fb           = inject(FormBuilder);

  reminders = signal<ExamReminder[]>([]);
  examTypes = signal<ExamType[]>([]);
  profiles  = signal<Profile[]>([]);

  savingAi       = signal(false);
  savingReminder = signal(false);
  showReminderDialog = false;

  aiProviders = AI_PROVIDERS;
  availableModels = signal(AI_MODELS['gemini']);

  aiForm = this.fb.group({
    aiProvider: ['gemini', Validators.required],
    aiModel:    ['gemini-1.5-flash'],
    aiApiKey:   [''],
  });

  reminderForm = this.fb.group({
    profileId:      [null as number | null, Validators.required],
    examTypeId:     [null as number | null, Validators.required],
    intervalMonths: [6, [Validators.required, Validators.min(1)]],
  });

  ngOnInit(): void {
    this.settingsSvc.get().subscribe(r => {
      if (r.data) {
        this.aiForm.patchValue({
          aiProvider: r.data.aiProvider,
          aiModel: r.data.aiModel,
          aiApiKey: r.data.aiApiKey ? '••••••••' : '',
        });
        this.availableModels.set(AI_MODELS[r.data.aiProvider] || []);
      }
    });
    this.reminderSvc.getAll().subscribe(r => this.reminders.set(r.data || []));
    this.examTypeSvc.getAll().subscribe(r => this.examTypes.set(r.data || []));
    this.profileSvc.getAll().subscribe(r => this.profiles.set(r.data || []));
  }

  onProviderChange(): void {
    const p = this.aiForm.value.aiProvider as string;
    this.availableModels.set(AI_MODELS[p] || []);
    this.aiForm.patchValue({ aiModel: AI_MODELS[p]?.[0]?.value || '' });
  }

  saveAi(): void {
    this.savingAi.set(true);
    const v = this.aiForm.value;
    const payload: Partial<UserSettings> = {
      aiProvider: v.aiProvider as any,
      aiModel:    v.aiModel || null,
    };
    if (v.aiApiKey && !v.aiApiKey.startsWith('•')) {
      (payload as any).aiApiKey = v.aiApiKey;
    }

    this.settingsSvc.update(payload).subscribe({
      next: () => {
        this.savingAi.set(false);
        this.toast.add({ severity: 'success', summary: 'Salvo!', detail: 'Configurações de IA atualizadas.' });
      },
      error: err => {
        this.savingAi.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: err.error?.error || 'Erro ao salvar.' });
      },
    });
  }

  openReminderForm(): void {
    this.reminderForm.reset({ intervalMonths: 6 });
    this.showReminderDialog = true;
  }

  saveReminder(): void {
    if (this.reminderForm.invalid) return;
    this.savingReminder.set(true);
    this.reminderSvc.create(this.reminderForm.value as any).subscribe({
      next: () => {
        this.savingReminder.set(false);
        this.showReminderDialog = false;
        this.toast.add({ severity: 'success', summary: 'Criado!', detail: 'Lembrete configurado.' });
        this.reminderSvc.getAll().subscribe(r => this.reminders.set(r.data || []));
      },
      error: err => {
        this.savingReminder.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: err.error?.error || 'Erro ao criar.' });
      },
    });
  }

  deleteReminder(r: ExamReminder): void {
    this.confirm.confirm({
      message: `Remover lembrete de "${r.ExamType?.name}"?`,
      header: 'Confirmar',
      acceptLabel: 'Remover',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.reminderSvc.delete(r.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Removido', detail: 'Lembrete excluído.' });
            this.reminders.update(list => list.filter(x => x.id !== r.id));
          },
        });
      },
    });
  }
}
