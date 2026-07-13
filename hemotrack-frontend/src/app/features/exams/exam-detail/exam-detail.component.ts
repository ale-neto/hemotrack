import { Component, inject, OnInit, signal } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { DatePipe } from '@angular/common';
import { ButtonModule } from 'primeng/button';
import { TagModule } from 'primeng/tag';
import { SkeletonModule } from 'primeng/skeleton';
import { TableModule } from 'primeng/table';
import { ExamService } from '../../../core/services/api.service';
import { BloodExam, ExamResult, ResultStatus } from '../../../core/models';

@Component({
  selector: 'app-exam-detail',
  standalone: true,
  imports: [RouterLink, DatePipe, ButtonModule, TagModule, SkeletonModule, TableModule],
  template: `
    <div class="fade-in" style="max-width:800px">
      @if (loading()) {
        <p-skeleton height="200px" borderRadius="12px" />
      } @else if (exam()) {
        <!-- Header card -->
        <div class="card exam-header">
          <div class="exam-header-left">
            <div class="exam-type-badge">
              {{ exam()!.ExamType?.category || 'Exame' }}
            </div>
            <h1 class="page-title">{{ exam()!.ExamType?.name }}</h1>
            <div class="exam-meta-row">
              <span><i class="pi pi-calendar"></i> {{ exam()!.examDate | date:'dd/MM/yyyy' }}</span>
              @if (exam()!.labName) {
                <span><i class="pi pi-building"></i> {{ exam()!.labName }}</span>
              }
              <span><i class="pi pi-user"></i> {{ exam()!.UserProfile?.name }}</span>
            </div>
          </div>
          <div class="exam-header-right">
            <p-tag
              [value]="exam()!.origin === 'pdf_extracted' ? 'Extraído de PDF' : 'Manual'"
              [severity]="exam()!.origin === 'pdf_extracted' ? 'info' : 'secondary'"
            />
            <a [routerLink]="['/reports']" [queryParams]="{ examTypeId: exam()!.examTypeId, profileId: exam()!.profileId }">
              <p-button label="Ver histórico" icon="pi pi-chart-line" [outlined]="true" size="small" />
            </a>
            <a routerLink="/exams">
              <p-button icon="pi pi-arrow-left" [text]="true" size="small" />
            </a>
          </div>
        </div>

        <!-- Results -->
        <div class="card" style="padding:0; overflow:hidden; margin-top:1.25rem">
          <div style="padding:1.25rem 1.5rem; border-bottom:1px solid var(--ht-border)">
            <h2 class="section-title">Resultados</h2>
          </div>
          <p-table [value]="exam()!.ExamResults || []" styleClass="p-datatable-sm">
            <ng-template pTemplate="header">
              <tr>
                <th>Marcador</th>
                <th style="text-align:right">Valor</th>
                <th>Unidade</th>
                <th>Referência</th>
                <th>Status</th>
              </tr>
            </ng-template>
            <ng-template pTemplate="body" let-result>
              <tr>
                <td style="font-weight:500">{{ result.markerName }}</td>
                <td style="text-align:right">
                  <span class="value-mono">{{ result.value }}</span>
                </td>
                <td><span style="color:var(--ht-text-3);font-size:.8rem">{{ result.unit || '—' }}</span></td>
                <td>
                  @if (result.refMin !== null || result.refMax !== null) {
                    <span class="ref-range">{{ result.refMin ?? '—' }} – {{ result.refMax ?? '—' }}</span>
                  } @else {
                    <span style="color:var(--ht-text-3)">—</span>
                  }
                </td>
                <td>
                  <span class="status-badge {{ result.status }}">
                    {{ statusLabel(result.status) }}
                  </span>
                </td>
              </tr>
            </ng-template>
          </p-table>
        </div>

        @if (exam()!.notes) {
          <div class="card notes-card" style="margin-top:1.25rem">
            <h3 class="section-title" style="margin-bottom:.5rem">Observações</h3>
            <p style="color:var(--ht-text-2); font-size:.875rem">{{ exam()!.notes }}</p>
          </div>
        }
      } @else {
        <div class="card" style="text-align:center; padding:3rem">
          <p>Exame não encontrado.</p>
          <a routerLink="/exams"><p-button label="Voltar" icon="pi pi-arrow-left" styleClass="mt-2" /></a>
        </div>
      }
    </div>
  `,
  styles: [`
    .exam-header {
      display: flex; justify-content: space-between; align-items: flex-start;
      gap: 1rem; flex-wrap: wrap;
    }
    .exam-type-badge {
      display: inline-block;
      background: var(--ht-red-muted); color: var(--ht-red);
      font-size: .7rem; font-weight: 700; text-transform: uppercase; letter-spacing: .08em;
      padding: .2rem .6rem; border-radius: 999px; margin-bottom: .5rem;
    }
    .exam-meta-row {
      display: flex; flex-wrap: wrap; gap: 1rem; margin-top: .5rem;
      color: var(--ht-text-3); font-size: .8rem;
      span { display: flex; align-items: center; gap: .3rem; }
    }
    .exam-header-right { display: flex; align-items: center; gap: .5rem; flex-wrap: wrap; }

    .ref-range { font-family: var(--font-mono); font-size: .78rem; color: var(--ht-text-3); }
    .notes-card {}
  `],
})
export class ExamDetailComponent implements OnInit {
  private route   = inject(ActivatedRoute);
  private examSvc = inject(ExamService);

  loading = signal(true);
  exam    = signal<BloodExam | null>(null);

  ngOnInit(): void {
    const id = Number(this.route.snapshot.paramMap.get('id'));
    this.examSvc.getOne(id).subscribe({
      next: r => { this.exam.set(r.data || null); this.loading.set(false); },
      error: () => this.loading.set(false),
    });
  }

  statusLabel(s: ResultStatus): string {
    const map: Record<ResultStatus, string> = {
      normal:          'Normal',
      high:            'Alto',
      low:             'Baixo',
      sem_referencia:  'Sem ref.',
    };
    return map[s];
  }
}
