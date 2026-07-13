import { Component, inject, OnInit, signal } from '@angular/core';
import { FormBuilder, Validators, ReactiveFormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { DialogModule } from 'primeng/dialog';
import { InputTextModule } from 'primeng/inputtext';
import { SelectModule } from 'primeng/select';
import { InputNumberModule } from 'primeng/inputnumber';
import { FloatLabelModule } from 'primeng/floatlabel';
import { TagModule } from 'primeng/tag';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ProfileService } from '../../core/services/api.service';
import { Profile } from '../../core/models';

const RELATIONSHIP_OPTIONS = [
  { label: 'Titular', value: 'titular' },
  { label: 'Cônjuge', value: 'cônjuge' },
  { label: 'Filho(a)', value: 'filho(a)' },
  { label: 'Pai', value: 'pai' },
  { label: 'Mãe', value: 'mãe' },
  { label: 'Outro', value: 'outro' },
];

const SEX_OPTIONS = [
  { label: 'Masculino', value: 'masculino' },
  { label: 'Feminino', value: 'feminino' },
  { label: 'Outro', value: 'outro' },
];

@Component({
  selector: 'app-profiles',
  standalone: true,
  imports: [ReactiveFormsModule, ButtonModule, DialogModule, InputTextModule, SelectModule,
    InputNumberModule, FloatLabelModule, TagModule, ConfirmDialogModule],
  providers: [ConfirmationService],
  template: `
    <div class="fade-in">
      <p-confirmDialog />

      <div class="page-header">
        <h1 class="page-title">Perfis</h1>
        <p-button label="Novo perfil" icon="pi pi-plus" (onClick)="openForm()" />
      </div>

      @if (loading()) {
        <div class="profiles-grid">
          @for (i of [1,2,3]; track i) {
            <div class="profile-card skeleton-card"></div>
          }
        </div>
      } @else if (profiles().length === 0) {
        <div class="card empty-state">
          <i class="pi pi-users empty-icon"></i>
          <p>Nenhum perfil cadastrado.</p>
          <p-button label="Criar perfil" (onClick)="openForm()" />
        </div>
      } @else {
        <div class="profiles-grid">
          @for (p of profiles(); track p.id) {
            <div class="profile-card" [class.default-card]="p.isDefault">
              <div class="profile-card-header">
                <div class="profile-avatar">{{ p.name[0].toUpperCase() }}</div>
                <div class="profile-info">
                  <div class="profile-name">{{ p.name }}</div>
                  <div class="profile-rel">{{ p.relationship }}</div>
                </div>
                @if (p.isDefault) {
                  <p-tag value="Principal" severity="success" />
                }
              </div>

              <div class="profile-details">
                @if (p.age) {
                  <div class="detail-row">
                    <span class="label">Idade</span>
                    <span class="value-mono" style="font-size:.9rem">{{ p.age }} anos</span>
                  </div>
                }
                @if (p.bmi) {
                  <div class="detail-row">
                    <span class="label">IMC</span>
                    <span class="value-mono" style="font-size:.9rem">{{ p.bmi }}</span>
                  </div>
                }
                @if (p.sex) {
                  <div class="detail-row">
                    <span class="label">Sexo</span>
                    <span>{{ p.sex }}</span>
                  </div>
                }
                @if (p.diseases && p.diseases.length > 0) {
                  <div class="detail-row">
                    <span class="label">Doenças</span>
                    <span>{{ p.diseases.join(', ') }}</span>
                  </div>
                }
              </div>

              <div class="profile-actions">
                <p-button icon="pi pi-pencil" [text]="true" size="small" (onClick)="openForm(p)" />
                <p-button icon="pi pi-trash" [text]="true" severity="danger" size="small" (onClick)="confirmDelete(p)" [disabled]="p.isDefault" />
              </div>
            </div>
          }
        </div>
      }

      <!-- Form Dialog -->
<p-dialog
  [(visible)]="showDialog"
  [header]="editingId ? 'Editar Perfil' : 'Novo Perfil'"
  [modal]="true"
  [style]="{ width: '560px' }"
  [contentStyle]="{ 'overflow-y': 'auto', 'max-height': '70vh' }"
  [draggable]="false"
  appendTo="body"
>
        <form [formGroup]="form" (ngSubmit)="save()" class="profile-form">
          <div class="form-row">
            <p-floatlabel class="flex-1">
              <input pInputText id="name" formControlName="name" class="w-full" />
              <label for="name">Nome *</label>
            </p-floatlabel>

            <p-floatlabel class="flex-1">
              <p-select id="relationship" formControlName="relationship" [options]="relOptions" optionLabel="label" optionValue="value" styleClass="w-full" />
              <label for="relationship">Parentesco</label>
            </p-floatlabel>
          </div>

          <div class="form-row">
            <p-floatlabel class="flex-1">
              <p-inputnumber id="weight" formControlName="weight" suffix=" kg" [minFractionDigits]="1" styleClass="w-full" inputStyleClass="w-full" />
              <label for="weight">Peso (kg)</label>
            </p-floatlabel>
            <p-floatlabel class="flex-1">
              <p-inputnumber id="height" formControlName="height" suffix=" cm" styleClass="w-full" inputStyleClass="w-full" />
              <label for="height">Altura (cm)</label>
            </p-floatlabel>
          </div>

          <div class="form-row">
            <p-floatlabel class="flex-1">
              <p-select id="sex" formControlName="sex" [options]="sexOptions" optionLabel="label" optionValue="value" styleClass="w-full" [showClear]="true" />
              <label for="sex">Sexo biológico</label>
            </p-floatlabel>
          </div>

          <div style="display:flex; justify-content:flex-end; gap:.5rem; margin-top:.5rem">
            <p-button label="Cancelar" [outlined]="true" type="button" (onClick)="showDialog = false" />
            <p-button label="Salvar" icon="pi pi-check" type="submit" [loading]="saving()" [disabled]="form.invalid" />
          </div>
        </form>
      </p-dialog>
    </div>
  `,
  styles: [`
    .page-header {
      display: flex; align-items: center; justify-content: space-between;
      margin-bottom: 1.5rem;
    }

    .profiles-grid {
      display: grid;
      grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
      gap: 1rem;
    }

    .profile-card {
      background: var(--ht-white); border: 1px solid var(--ht-border);
      border-radius: var(--radius); padding: 1.25rem; box-shadow: var(--shadow-sm);
      display: flex; flex-direction: column; gap: .875rem;
      transition: box-shadow var(--transition);
      &:hover { box-shadow: var(--shadow-md); }
      &.default-card { border-color: var(--ht-ok); }
    }

    .skeleton-card { height: 160px; background: var(--ht-border); border-radius: var(--radius); }

    .profile-card-header { display: flex; align-items: center; gap: .75rem; }

    .profile-avatar {
      width: 40px; height: 40px; border-radius: 50%;
      background: var(--ht-red-muted); color: var(--ht-red);
      display: flex; align-items: center; justify-content: center;
      font-weight: 700; font-size: 1rem; flex-shrink: 0;
    }

    .profile-name { font-weight: 600; font-size: .9rem; color: var(--ht-text); }
    .profile-rel  { font-size: .75rem; color: var(--ht-text-3); text-transform: capitalize; }

    .profile-details { display: flex; flex-direction: column; gap: .3rem; flex: 1; }
    .detail-row {
      display: flex; align-items: center; gap: .5rem; font-size: .8rem;
      .label { color: var(--ht-text-3); min-width: 50px; font-weight: 600; font-size: .7rem; text-transform: uppercase; letter-spacing: .05em; }
    }

    .profile-actions { display: flex; justify-content: flex-end; gap: .25rem; }

    .empty-state {
      text-align: center; padding: 4rem; color: var(--ht-text-3);
      display: flex; flex-direction: column; align-items: center; gap: .75rem;
    }
    .empty-icon { font-size: 3rem; opacity: .25; }

    .profile-form { display: flex; flex-direction: column; gap: 1.5rem; padding-top: .5rem; }
    .form-row { display: flex; gap: 1rem; flex-wrap: wrap; > * { min-width: 180px; } }
  `],
})
export class ProfilesComponent implements OnInit {
  private profileSvc = inject(ProfileService);
  private confirm = inject(ConfirmationService);
  private toast = inject(MessageService);
  private fb = inject(FormBuilder);

  profiles = signal<Profile[]>([]);
  loading = signal(true);
  saving = signal(false);
  showDialog = false;
  editingId?: number;

  relOptions = RELATIONSHIP_OPTIONS;
  sexOptions = SEX_OPTIONS;

  form = this.fb.group({
    name: ['', [Validators.required, Validators.minLength(2)]],
    relationship: ['titular'],
    weight: [null as number | null],
    height: [null as number | null],
    sex: [null as string | null],
  });

  ngOnInit(): void {
    this.loadProfiles();
  }

  loadProfiles(): void {
    this.loading.set(true);
    this.profileSvc.getAll().subscribe({
      next: r => { this.profiles.set(r.data || []); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  openForm(profile?: Profile): void {
    this.editingId = profile?.id;
    this.form.reset({ relationship: 'titular' });
    if (profile) {
      this.form.patchValue({
        name: profile.name,
        relationship: profile.relationship,
        weight: profile.weight,
        height: profile.height,
        sex: profile.sex,
      });
    }
    this.showDialog = true;
  }

  save(): void {
    if (this.form.invalid) return;
    this.saving.set(true);
    const obs = this.editingId
      ? this.profileSvc.update(this.editingId, this.form.value as any)
      : this.profileSvc.create(this.form.value as any);

    obs.subscribe({
      next: () => {
        this.saving.set(false);
        this.showDialog = false;
        this.toast.add({ severity: 'success', summary: 'Salvo!', detail: 'Perfil atualizado.' });
        this.loadProfiles();
      },
      error: err => {
        this.saving.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: err.error?.error || 'Erro ao salvar.' });
      },
    });
  }

  confirmDelete(p: Profile): void {
    this.confirm.confirm({
      message: `Remover perfil "${p.name}"? Todos os exames associados serão excluídos.`,
      header: 'Confirmar exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Remover',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.profileSvc.delete(p.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Removido', detail: 'Perfil excluído.' });
            this.loadProfiles();
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível excluir.' }),
        });
      },
    });
  }
}
