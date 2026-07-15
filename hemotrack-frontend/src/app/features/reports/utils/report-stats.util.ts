import { ReportSeries } from '../models/report.model';

export function minValue(series: ReportSeries): string {
  return Math.min(...series.data.map(d => d.value)).toFixed(1);
}

export function maxValue(series: ReportSeries): string {
  return Math.max(...series.data.map(d => d.value)).toFixed(1);
}

export function avgValue(series: ReportSeries): string {
  return (series.data.reduce((sum, d) => sum + d.value, 0) / series.data.length).toFixed(1);
}
