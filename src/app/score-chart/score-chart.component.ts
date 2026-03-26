import {
  Component, Input, OnChanges, OnDestroy,
  ViewChild, ElementRef, SimpleChanges
} from '@angular/core';
import {
  Chart, LineController, LineElement, PointElement,
  LinearScale, CategoryScale, Tooltip, Legend, Filler
} from 'chart.js';

// Register only what we use — tree-shaking friendly
Chart.register(LineController, LineElement, PointElement, LinearScale, CategoryScale, Tooltip, Legend, Filler);

import { ScoreDataPoint } from '../models/score-history.model';

@Component({
  selector: 'app-score-chart',
  templateUrl: './score-chart.component.html',
})
export class ScoreChartComponent implements OnChanges, OnDestroy {
  @Input() dataPoints: ScoreDataPoint[] = [];
  @Input() showMovingAverage = false;
  @Input() compact = false;            // true = sparkline mode (account page)

  @ViewChild('chartCanvas') canvasRef!: ElementRef<HTMLCanvasElement>;

  private chart: Chart | null = null;

  get hasEnoughData(): boolean {
    return this.dataPoints.length >= 3;
  }

  ngOnChanges(changes: SimpleChanges): void {
    if (changes['dataPoints']) {
      // setTimeout 0: tunggu *ngIf me-render canvas ke DOM sebelum diakses
      setTimeout(() => this.buildChart(), 0);
    }
  }

  ngOnDestroy(): void {
    this.destroyChart();
  }

  private destroyChart(): void {
    if (this.chart) {
      this.chart.destroy();
      this.chart = null;
    }
  }

  private formatLabel(isoDate: string): string {
    const d = new Date(isoDate);
    return d.toLocaleDateString('id-ID', { day: 'numeric', month: 'short' });
  }

  private buildChart(): void {
    if (!this.hasEnoughData || !this.canvasRef) return;

    // WAJIB destroy sebelum new Chart() — hindari "Canvas is already in use" error
    this.destroyChart();

    const ctx = this.canvasRef.nativeElement.getContext('2d');
    if (!ctx) return;

    const labels = this.dataPoints.map(d => this.formatLabel(d.completed_at));
    const scores = this.dataPoints.map(d => d.score);

    const datasets: any[] = [{
      label: 'Skor',
      data: scores,
      borderColor: '#5e6ad2',
      backgroundColor: 'rgba(94,106,210,0.1)',
      fill: true,
      tension: 0.3,
      pointRadius: this.compact ? 0 : 4,
      pointHoverRadius: this.compact ? 0 : 6,
    }];

    if (this.showMovingAverage && !this.compact) {
      datasets.push({
        label: 'Moving Avg (7 sesi)',
        data: this.computeMovingAverage(scores, 7),
        borderColor: '#f2c94c',
        borderDash: [4, 4],
        pointRadius: 0,
        fill: false,
        tension: 0.3,
      });
    }

    this.chart = new Chart(ctx, {
      type: 'line',
      data: { labels, datasets },
      options: {
        responsive: true,
        maintainAspectRatio: !this.compact,
        plugins: {
          legend: { display: !this.compact },
          tooltip: {
            enabled: !this.compact,
            callbacks: {
              afterBody: (items) => {
                const pt = this.dataPoints[items[0]?.dataIndex];
                return pt ? [`Paket: ${pt.package_name}`, `Benar: ${pt.correct} | Salah: ${pt.incorrect}`] : [];
              }
            }
          }
        },
        scales: {
          y: {
            min: 0,
            max: 100,
            display: !this.compact,
            ticks: { stepSize: 20 }
          },
          x: {
            display: !this.compact,
            ticks: { maxTicksLimit: 6 }
          }
        }
      }
    });
  }

  private computeMovingAverage(data: number[], window: number): (number | null)[] {
    return data.map((_, i) => {
      if (i < window - 1) return null;
      const slice = data.slice(i - window + 1, i + 1);
      return Math.round(slice.reduce((a, b) => a + b, 0) / window);
    });
  }
}
