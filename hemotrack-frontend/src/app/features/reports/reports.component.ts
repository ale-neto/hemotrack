import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { MessageService } from 'primeng/api';
import { ReportService, ProfileService, ExamTypeService } from '../../core/services/api.service';
import { Profile, ExamType, ReportData, ReportSeries } from '../../core/models';
import { Chart, ChartConfiguration, registerables } from 'chart.js';
import { environment } from '@env/environment';
import { AuthService } from '@core/services/auth.service';

Chart.register(...registerables);

const CHART_COLORS = [
  '#E8344A', '#2563EB', '#16A34A', '#D97706', '#9333EA',
  '#0891B2', '#EA580C', '#65A30D',
];

@Component({
  selector: 'app-reports',
  standalone: true,
  imports: [FormsModule, RouterLink, ButtonModule, SelectModule, CardModule, SkeletonModule, Tabs, TabList, Tab, TabPanels, TabPanel],
  template: `
    <div class="fade-in">
      <div class="page-header">
        <div>
          <h1 class="page-title">Relatórios</h1>
          <p class="page-subtitle">Acompanhe a evolução dos seus marcadores ao longo do tempo</p>
        </div>
      </div>

      <!-- Filters -->
      <div class="card filters-bar">
        <p-select
          [options]="profiles()"
          [(ngModel)]="selectedProfileId"
          optionLabel="name"
          optionValue="id"
          placeholder="Todos os perfis"
          [showClear]="true"
          styleClass="filter-select"
          (onChange)="onProfileChange()"
        />
        <p-select
          [options]="examTypes()"
          [(ngModel)]="selectedExamTypeId"
          optionLabel="name"
          optionValue="id"
          placeholder="Selecione o tipo de exame"
          styleClass="filter-select"
          [disabled]="loadingExamTypes()"
          (onChange)="load()"
        />
        @if (loadingExamTypes()) {
          <i class="pi pi-spin pi-spinner" style="color:var(--ht-text-3)"></i>
        }
      </div>

      <!-- Empty: no exam types available -->
      @if (!loadingExamTypes() && examTypes().length === 0) {
        <div class="card empty-state">
          <i class="pi pi-inbox empty-icon"></i>
          <p>Nenhum exame encontrado{{ selectedProfileId ? ' para este perfil' : '' }}.</p>
          <p style="font-size:.8rem; color:var(--ht-text-3)">
            Faça o upload de um PDF ou cadastre um exame manualmente.
          </p>
          <p-button label="Novo exame" icon="pi pi-plus" routerLink="/exams/new" size="small" />
        </div>
      } @else if (!selectedExamTypeId) {
        <div class="card empty-state">
          <i class="pi pi-chart-line empty-icon"></i>
          <p>Selecione um tipo de exame para ver o histórico</p>
        </div>
      } @else if (loading()) {
        <p-skeleton height="400px" borderRadius="12px" />
      } @else if (!reportData()) {
        <div class="card empty-state">
          <p>Nenhum dado disponível para este filtro.</p>
        </div>
      } @else {
        <!-- Chart tabs -->
        <p-tabs [value]="activeMarker()">
          <p-tablist>
            @for (series of reportData()!.series; track series.name) {
              <p-tab [value]="series.name" (click)="selectMarker(series.name)">
                {{ series.name }}
              </p-tab>
            }
          </p-tablist>

          <p-tabpanels>
            @for (series of reportData()!.series; track series.name) {
              <p-tabpanel [value]="series.name">
                <div class="chart-container">
                  <canvas id="chart-{{ series.name }}"></canvas>
                </div>
                <div class="series-stats">
                  <div class="stat-pill">
                    <span class="label">Mín</span>
                    <span class="value-mono">{{ minVal(series) }}</span>
                    <span style="color:var(--ht-text-3);font-size:.75rem">{{ series.unit }}</span>
                  </div>
                  <div class="stat-pill">
                    <span class="label">Máx</span>
                    <span class="value-mono">{{ maxVal(series) }}</span>
                    <span style="color:var(--ht-text-3);font-size:.75rem">{{ series.unit }}</span>
                  </div>
                  <div class="stat-pill">
                    <span class="label">Média</span>
                    <span class="value-mono">{{ avgVal(series) }}</span>
                    <span style="color:var(--ht-text-3);font-size:.75rem">{{ series.unit }}</span>
                  </div>
                  <div class="stat-pill">
                    <span class="label">Referência</span>
                    <span class="value-mono" style="font-size:.85rem">{{ series.refMin ?? '—' }} – {{ series.refMax ?? '—' }}</span>
                    <span style="color:var(--ht-text-3);font-size:.75rem">{{ series.unit }}</span>
                  </div>
                </div>
              </p-tabpanel>
            }
          </p-tabpanels>
        </p-tabs>

        <!-- AI Analysis -->
        @if (selectedProfileId) {
          <div class="card analysis-card" style="margin-top:1.25rem">
            <div class="flex items-center justify-between" style="margin-bottom:.875rem">
              <h2 class="section-title">
                <i class="pi pi-sparkles" style="color:var(--ht-red)"></i>
                Análise por IA
              </h2>
              <p-button
                label="Gerar análise"
                icon="pi pi-sparkles"
                (onClick)="analyze()"
                [loading]="analyzing()"
                [outlined]="true"
                size="small"
              />
            </div>

            @if (aiAnalysis()) {
              <div class="analysis-text">{{ aiAnalysis() }}</div>
            } @else {
              <p style="color:var(--ht-text-3); font-size:.875rem">
                Clique em "Gerar análise" para obter uma avaliação do seu histórico de exames por inteligência artificial.
                Certifique-se de ter configurado sua API Key em <a routerLink="/settings" style="color:var(--ht-red)">Configurações</a>.
              </p>
            }
          </div>
        }

        <!-- Export -->
        <div style="display:flex; justify-content:flex-end; margin-top:1rem">
          <p-button
            label="Exportar PDF"
            icon="pi pi-file-pdf"
            [outlined]="true"
            [disabled]="!selectedProfileId"
            (onClick)="exportPdf()"
          />
        </div>
      }
    </div>
  `,
  styles: [`
    .page-header {
      display: flex; align-items: flex-start; justify-content: space-between;
      margin-bottom: 1.5rem;
    }
    .page-subtitle { color: var(--ht-text-3); font-size: .875rem; }

    .filters-bar {
      display: flex; align-items: center; gap: 1rem; margin-bottom: 1.25rem; flex-wrap: wrap;
      padding: .875rem 1.25rem;
    }
    ::ng-deep .filter-select { min-width: 220px; }

    ::ng-deep .p-tablist {
      overflow-x: auto;
      flex-wrap: nowrap;
    }
    ::ng-deep .p-tablist-tab-list {
      flex-wrap: nowrap;
    }

    .empty-state {
      text-align: center; padding: 4rem 1rem; color: var(--ht-text-3);
      display: flex; flex-direction: column; align-items: center; gap: .75rem;
    }
    .empty-icon { font-size: 3rem; opacity: .25; }

    .chart-container {
      position: relative; height: 320px; margin: 1rem 0;
    }

    .series-stats {
      display: flex; gap: 1rem; flex-wrap: wrap; margin-top: .5rem;
    }
    .stat-pill {
      display: flex; flex-direction: column; gap: .15rem;
      background: var(--ht-off-white); padding: .6rem 1rem; border-radius: var(--radius-sm);
      .label { font-size: .7rem; font-weight: 600; color: var(--ht-text-3); text-transform: uppercase; letter-spacing: .05em; }
    }

    .analysis-card {}
    .analysis-text {
      white-space: pre-wrap; font-size: .875rem; line-height: 1.7;
      color: var(--ht-text-2); background: var(--ht-off-white);
      padding: 1rem; border-radius: var(--radius-sm); border-left: 3px solid var(--ht-red);
    }
  `],
})
export class ReportsComponent implements OnInit, OnDestroy {
  private route       = inject(ActivatedRoute);
  private reportSvc   = inject(ReportService);
  private profileSvc  = inject(ProfileService);
  private examTypeSvc = inject(ExamTypeService);
  private auth        = inject(AuthService);
  private toast       = inject(MessageService);

  profiles   = signal<Profile[]>([]);
  examTypes  = signal<ExamType[]>([]);
  reportData = signal<ReportData | null>(null);
  aiAnalysis = signal<string | null>(null);

  loading          = signal(false);
  loadingExamTypes = signal(false);
  analyzing        = signal(false);

  selectedExamTypeId?: number;
  selectedProfileId?:  number;
  activeMarker = signal<string>('');

  private charts: Map<string, Chart> = new Map();

  ngOnInit(): void {
    this.profileSvc.getAll().subscribe(r => this.profiles.set(r.data || []));
    this.loadExamTypes();

    const params = this.route.snapshot.queryParams;
    if (params['examTypeId']) {
      this.selectedExamTypeId = +params['examTypeId'];
      this.selectedProfileId  = params['profileId'] ? +params['profileId'] : undefined;
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.charts.forEach(c => c.destroy());
  }

  loadExamTypes(): void {
    this.loadingExamTypes.set(true);
    this.examTypeSvc.getWithExams(this.selectedProfileId).subscribe({
      next: r => {
        this.examTypes.set(r.data || []);
        // Reset selected exam type if it no longer exists in the list
        if (this.selectedExamTypeId) {
          const exists = (r.data || []).some((t: ExamType) => t.id === this.selectedExamTypeId);
          if (!exists) {
            this.selectedExamTypeId = undefined;
            this.reportData.set(null);
            this.destroyCharts();
          }
        }
        this.loadingExamTypes.set(false);
      },
      error: () => {
        this.loadingExamTypes.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar os tipos de exame.' });
      },
    });
  }

  onProfileChange(): void {
    this.selectedExamTypeId = undefined;
    this.reportData.set(null);
    this.aiAnalysis.set(null);
    this.destroyCharts();
    this.loadExamTypes();
  }

  load(): void {
    if (!this.selectedExamTypeId) return;
    this.loading.set(true);
    this.aiAnalysis.set(null);
    this.destroyCharts();

    this.reportSvc.getReport(this.selectedExamTypeId, this.selectedProfileId).subscribe({
      next: r => {
        this.reportData.set(r.data || null);
        this.loading.set(false);
        if (r.data?.series?.length) {
          this.activeMarker.set(r.data.series[0].name);
          setTimeout(() => this.buildCharts(r.data!.series), 100);
        }
      },
      error: () => {
        this.loading.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível carregar o relatório.' });
      },
    });
  }

  selectMarker(name: string): void {
    this.activeMarker.set(name);
    setTimeout(() => {
      const s = this.reportData()?.series.find(s => s.name === name);
      if (s) this.buildChart(s);
    }, 50);
  }

  analyze(): void {
    if (!this.selectedExamTypeId || !this.selectedProfileId) return;
    this.analyzing.set(true);
    this.reportSvc.analyze(this.selectedExamTypeId, this.selectedProfileId).subscribe({
      next: r => { this.aiAnalysis.set(r.data?.analysis || null); this.analyzing.set(false); },
      error: (err) => {
        this.analyzing.set(false);
        this.toast.add({ severity: 'error', summary: 'Erro na análise', detail: err.error?.error || 'Não foi possível gerar a análise de IA.' });
      },
    });
  }

  exportPdf(): void {
    const url = `${environment.apiUrl}/reports/${this.selectedExamTypeId}/pdf?profileId=${this.selectedProfileId}${this.aiAnalysis() ? '&analysis=' + encodeURIComponent(this.aiAnalysis()!) : ''}`;
    const token = this.auth.token();
    fetch(url, { headers: { Authorization: `Bearer ${token}` } })
      .then(r => {
        if (!r.ok) throw new Error('Falha ao gerar PDF');
        return r.blob();
      })
      .then(blob => {
        const a = document.createElement('a');
        a.href = URL.createObjectURL(blob);
        a.download = `hemotrack-relatorio.pdf`;
        a.click();
      })
      .catch(() => {
        this.toast.add({ severity: 'error', summary: 'Erro', detail: 'Não foi possível gerar o PDF do relatório.' });
      });
  }

  private buildCharts(series: ReportSeries[]): void {
    series.forEach(s => this.buildChart(s));
  }

  private buildChart(series: ReportSeries): void {
    const canvasId = `chart-${series.name}`;
    const canvas = document.getElementById(canvasId) as HTMLCanvasElement;
    if (!canvas) return;

    if (this.charts.has(series.name)) {
      this.charts.get(series.name)!.destroy();
    }

    const labels = series.data.map(d => {
      const [y, m, day] = d.date.split('-');
      return `${day}/${m}/${y}`;
    });
    const values = series.data.map(d => d.value);
    const color  = CHART_COLORS[0];

    const datasets: any[] = [
      {
        label: series.name,
        data: values,
        borderColor: color,
        backgroundColor: color + '20',
        borderWidth: 2,
        pointBackgroundColor: values.map(v => {
          if (series.refMin !== null && v < series.refMin) return '#2563EB';
          if (series.refMax !== null && v > series.refMax) return '#E8344A';
          return '#16A34A';
        }),
        pointRadius: 5,
        pointHoverRadius: 7,
        tension: 0.35,
        fill: true,
      },
    ];

    if (series.refMin !== null) {
      datasets.push({
        label: `Mín (${series.refMin})`,
        data: new Array(values.length).fill(series.refMin),
        borderColor: '#2563EB44',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      });
    }

    if (series.refMax !== null) {
      datasets.push({
        label: `Máx (${series.refMax})`,
        data: new Array(values.length).fill(series.refMax),
        borderColor: '#E8344A44',
        borderDash: [6, 4],
        borderWidth: 1.5,
        pointRadius: 0,
        fill: false,
      });
    }

    const config: ChartConfiguration = {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: datasets.length > 1 },
          tooltip: {
            callbacks: {
              label: ctx => `${ctx.dataset.label}: ${ctx.parsed.y} ${series.unit || ''}`,
            },
          },
        },
        scales: {
          x: { grid: { color: '#E4E8EF' } },
          y: {
            grid: { color: '#E4E8EF' },
            ticks: { callback: v => `${parseFloat(Number(v).toFixed(2))} ${series.unit || ''}` },
          },
        },
      },
    };

    this.charts.set(series.name, new Chart(canvas, config));
  }

  private destroyCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts.clear();
  }

  minVal(s: ReportSeries) { return Math.min(...s.data.map(d => d.value)).toFixed(1); }
  maxVal(s: ReportSeries) { return Math.max(...s.data.map(d => d.value)).toFixed(1); }
  avgVal(s: ReportSeries) { return (s.data.reduce((a, d) => a + d.value, 0) / s.data.length).toFixed(1); }
}
