import { Component, inject, OnInit, signal, OnDestroy } from '@angular/core';
import { ActivatedRoute, RouterLink } from '@angular/router';
import { FormsModule } from '@angular/forms';
import { ButtonModule } from 'primeng/button';
import { SelectModule } from 'primeng/select';
import { CardModule } from 'primeng/card';
import { SkeletonModule } from 'primeng/skeleton';
import { Tabs, TabList, Tab, TabPanels, TabPanel } from 'primeng/tabs';
import { Chart, registerables } from 'chart.js';
import { ReportsFacade } from './facades/reports.facade';
import { buildChartConfig } from './mappers/report-chart.mapper';
import { minValue, maxValue, avgValue } from './utils/report-stats.util';
import { downloadBlob } from '@shared/utils/download.util';
import { ReportSeries } from './models/report.model';
import { ExamType } from '@features/exams/models/exam.model';

Chart.register(...registerables);

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
  private route = inject(ActivatedRoute);
  private reportsFacade = inject(ReportsFacade);

  profiles   = this.reportsFacade.profiles;
  examTypes  = this.reportsFacade.examTypes;
  reportData = this.reportsFacade.reportData;
  aiAnalysis = this.reportsFacade.aiAnalysis;

  loading          = this.reportsFacade.loading;
  loadingExamTypes = this.reportsFacade.loadingExamTypes;
  analyzing        = this.reportsFacade.analyzing;

  selectedExamTypeId?: number;
  selectedProfileId?:  number;
  activeMarker = signal<string>('');

  minVal = minValue;
  maxVal = maxValue;
  avgVal = avgValue;

  private charts: Map<string, Chart> = new Map();

  ngOnInit(): void {
    this.reportsFacade.loadProfiles();
    this.loadExamTypes();

    const params = this.route.snapshot.queryParams;
    if (params['examTypeId']) {
      this.selectedExamTypeId = +params['examTypeId'];
      this.selectedProfileId  = params['profileId'] ? +params['profileId'] : undefined;
      this.load();
    }
  }

  ngOnDestroy(): void {
    this.destroyCharts();
  }

  loadExamTypes(): void {
    this.reportsFacade.loadExamTypes(this.selectedProfileId, (examTypes: ExamType[]) => {
      if (this.selectedExamTypeId && !examTypes.some(t => t.id === this.selectedExamTypeId)) {
        this.selectedExamTypeId = undefined;
        this.reportsFacade.clearReport();
        this.destroyCharts();
      }
    });
  }

  onProfileChange(): void {
    this.selectedExamTypeId = undefined;
    this.reportsFacade.clearReport();
    this.destroyCharts();
    this.loadExamTypes();
  }

  load(): void {
    if (!this.selectedExamTypeId) return;
    this.destroyCharts();

    this.reportsFacade.load(this.selectedExamTypeId, this.selectedProfileId, data => {
      if (data?.series?.length) {
        this.activeMarker.set(data.series[0].name);
        setTimeout(() => this.buildCharts(data.series), 100);
      }
    });
  }

  selectMarker(name: string): void {
    this.activeMarker.set(name);
    setTimeout(() => {
      const series = this.reportData()?.series.find(s => s.name === name);
      if (series) this.buildChart(series);
    }, 50);
  }

  analyze(): void {
    if (!this.selectedExamTypeId || !this.selectedProfileId) return;
    this.reportsFacade.analyze(this.selectedExamTypeId, this.selectedProfileId);
  }

  exportPdf(): void {
    if (!this.selectedExamTypeId || !this.selectedProfileId) return;
    this.reportsFacade.downloadPdf(this.selectedExamTypeId, this.selectedProfileId, blob =>
      downloadBlob(blob, 'hemotrack-relatorio.pdf'),
    );
  }

  private buildCharts(series: ReportSeries[]): void {
    series.forEach(s => this.buildChart(s));
  }

  private buildChart(series: ReportSeries): void {
    const canvas = document.getElementById(`chart-${series.name}`) as HTMLCanvasElement;
    if (!canvas) return;

    this.charts.get(series.name)?.destroy();
    this.charts.set(series.name, new Chart(canvas, buildChartConfig(series)));
  }

  private destroyCharts(): void {
    this.charts.forEach(c => c.destroy());
    this.charts.clear();
  }
}
