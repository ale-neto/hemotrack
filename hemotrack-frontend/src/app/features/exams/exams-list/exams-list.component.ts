import { Component, inject, OnInit, signal } from '@angular/core';
import { RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { TableModule } from 'primeng/table';
import { TagModule } from 'primeng/tag';
import { SelectModule } from 'primeng/select';
import { InputTextModule } from 'primeng/inputtext';
import { ConfirmDialogModule } from 'primeng/confirmdialog';
import { SkeletonModule } from 'primeng/skeleton';
import { ConfirmationService, MessageService } from 'primeng/api';
import { ExamService, ProfileService, ExamTypeService } from '../../../core/services/api.service';
import { BloodExam, Profile, ExamType } from '../../../core/models';

@Component({
  selector: 'app-exams-list',
  standalone: true,
  imports: [RouterLink, DatePipe, FormsModule, ButtonModule, TableModule, TagModule, SelectModule, InputTextModule, ConfirmDialogModule, SkeletonModule],
  providers: [ConfirmationService],
  template: `
    <div class="fade-in">
      <p-confirmDialog />

      <!-- Header -->
      <div class="page-header">
        <div>
          <h1 class="page-title">Exames</h1>
          <p class="page-subtitle">{{ exams().length }} registro(s)</p>
        </div>
        <a routerLink="/exams/new">
          <p-button label="Novo exame" icon="pi pi-plus" />
        </a>
      </div>

      <!-- Filters -->
      <div class="card filters-bar">
        <p-select
          [options]="profiles()"
          [(ngModel)]="selectedProfile"
          optionLabel="name"
          optionValue="id"
          placeholder="Todos os perfis"
          [showClear]="true"
          (onChange)="loadExams()"
          styleClass="filter-select"
        />
        <p-select
          [options]="examTypes()"
          [(ngModel)]="selectedExamType"
          optionLabel="name"
          optionValue="id"
          placeholder="Tipo de exame"
          [showClear]="true"
          (onChange)="loadExams()"
          styleClass="filter-select"
        />
        <p-button icon="pi pi-refresh" [text]="true" (onClick)="loadExams()" pTooltip="Atualizar" />
      </div>

      <!-- Table -->
      @if (loading()) {
        <div class="card">
          @for (i of [1,2,3,4,5]; track i) {
            <p-skeleton height="48px" borderRadius="8px" styleClass="mb-2" />
          }
        </div>
      } @else {
        <div class="card" style="padding:0; overflow:hidden">
          <p-table
            [value]="exams()"
            [paginator]="exams().length > 15"
            [rows]="15"
            [rowsPerPageOptions]="[15, 30, 50]"
            styleClass="p-datatable-sm"
            [tableStyle]="{ 'min-width': '640px' }"
          >
            <ng-template pTemplate="header">
              <tr>
                <th>Data</th>
                <th>Tipo</th>
                <th>Perfil</th>
                <th>Laboratório</th>
                <th>Origem</th>
                <th style="width:100px"></th>
              </tr>
            </ng-template>

            <ng-template pTemplate="body" let-exam>
              <tr>
                <td>
                  <span class="value-mono" style="font-size:.85rem">
                    {{ exam.examDate | date:'dd/MM/yyyy' }}
                  </span>
                </td>
                <td>{{ exam.ExamType?.name }}</td>
                <td>{{ exam.UserProfile?.name }}</td>
                <td>{{ exam.labName || '—' }}</td>
                <td>
                  <p-tag
                    [value]="exam.origin === 'pdf_extracted' ? 'PDF' : 'Manual'"
                    [severity]="exam.origin === 'pdf_extracted' ? 'info' : 'secondary'"
                  />
                </td>
                <td>
                  <div class="flex gap-1">
                    <a [routerLink]="['/exams', exam.id]">
                      <p-button icon="pi pi-eye" [text]="true" size="small" />
                    </a>
                    <p-button
                      icon="pi pi-trash"
                      [text]="true"
                      severity="danger"
                      size="small"
                      (onClick)="confirmDelete(exam)"
                    />
                  </div>
                </td>
              </tr>
            </ng-template>

            <ng-template pTemplate="emptymessage">
              <tr>
                <td colspan="6">
                  <div class="empty-state">
                    <i class="pi pi-file-edit empty-icon"></i>
                    <p>Nenhum exame encontrado.</p>
                    <a routerLink="/exams/new">
                      <p-button label="Adicionar exame" size="small" />
                    </a>
                  </div>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>
      }
    </div>
  `,
  styles: [`
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 1.5rem; gap: 1rem; flex-wrap: wrap;
    }
    .page-subtitle { color: var(--ht-text-3); font-size: .875rem; margin-top: .2rem; }

    .filters-bar {
      display: flex; align-items: center; gap: 1rem; margin-bottom: 1rem; flex-wrap: wrap;
      padding: .875rem 1.25rem;
    }

    ::ng-deep .filter-select { min-width: 200px; }

    .empty-state {
      text-align: center; padding: 3rem 1rem; color: var(--ht-text-3);
      display: flex; flex-direction: column; align-items: center; gap: .75rem;
    }
    .empty-icon { font-size: 2.5rem; opacity: .3; }
  `],
})
export class ExamsListComponent implements OnInit {
  private examSvc     = inject(ExamService);
  private profileSvc  = inject(ProfileService);
  private examTypeSvc = inject(ExamTypeService);
  private confirm     = inject(ConfirmationService);
  private toast       = inject(MessageService);

  loading     = signal(true);
  exams       = signal<BloodExam[]>([]);
  profiles    = signal<Profile[]>([]);
  examTypes   = signal<ExamType[]>([]);

  selectedProfile?: number;
  selectedExamType?: number;

  ngOnInit(): void {
    this.profileSvc.getAll().subscribe(r => this.profiles.set(r.data || []));
    this.examTypeSvc.getAll().subscribe(r => this.examTypes.set(r.data || []));
    this.loadExams();
  }

  loadExams(): void {
    this.loading.set(true);
    this.examSvc.getAll({
      profileId:  this.selectedProfile,
      examTypeId: this.selectedExamType,
    }).subscribe({
      next: r => { this.exams.set(r.data || []); this.loading.set(false); },
      error: () => {
        this.loading.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar os exames.' });
      },
    });
  }

  confirmDelete(exam: BloodExam): void {
    this.confirm.confirm({
      message: `Remover exame de ${exam.examDate}?`,
      header: 'Confirmar exclusão',
      icon: 'pi pi-exclamation-triangle',
      acceptLabel: 'Remover',
      rejectLabel: 'Cancelar',
      acceptButtonStyleClass: 'p-button-danger',
      accept: () => {
        this.examSvc.delete(exam.id).subscribe({
          next: () => {
            this.toast.add({ severity: 'success', summary: 'Removido', detail: 'Exame excluído.' });
            this.loadExams();
          },
          error: () => this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível excluir.' }),
        });
      },
    });
  }
}
