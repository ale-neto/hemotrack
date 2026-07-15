import { ChartConfiguration } from 'chart.js';
import { ReportSeries } from '../models/report.model';
import { RESULT_STATUS_COLORS } from '@shared/utils/result-status.util';

const LINE_COLOR = '#E8344A';

function formatDateBR(isoDate: string): string {
  const [year, month, day] = isoDate.split('-');
  return `${day}/${month}/${year}`;
}

/**
 * Monta a config do Chart.js para uma série. A cor de cada ponto vem de
 * `d.status` (calculado pelo backend em ExamResult.getStatus()) — antes essa
 * classificação normal/alto/baixo era re-derivada aqui na mão comparando
 * value com refMin/refMax, duplicando a mesma regra que já existe no backend
 * e no rótulo de status usado em exam-detail.
 */
export function buildChartConfig(series: ReportSeries): ChartConfiguration {
  const labels = series.data.map(d => formatDateBR(d.date));
  const values = series.data.map(d => d.value);

  const datasets: ChartConfiguration['data']['datasets'] = [
    {
      label: series.name,
      data: values,
      borderColor: LINE_COLOR,
      backgroundColor: LINE_COLOR + '20',
      borderWidth: 2,
      pointBackgroundColor: series.data.map(d => RESULT_STATUS_COLORS[d.status]),
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

  return {
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
}
