import { Component, OnInit, OnDestroy } from '@angular/core';
import { ChartConfiguration } from 'chart.js';
import { Subject } from 'rxjs';
import { takeUntil } from 'rxjs/operators';
import { TeamStoreService } from '../../services/team-store.service';
import { SprintProgressStoreService } from '../../services/sprint-progress-store.service';
import { SprintProgressData, StateBreakdown, BurndownPoint } from '../../models/sprint-progress.model';
import { TeamDTO } from '../../models/team.model';

@Component({
  selector: 'app-sprint-progress-dashboard',
  templateUrl: './sprint-progress-dashboard.component.html',
  styleUrls: ['./sprint-progress-dashboard.component.scss'],
})
export class SprintProgressDashboardComponent implements OnInit, OnDestroy {
  private destroy$ = new Subject<void>();

  current$ = this.teamStore.current$;
  data$ = this.sprintProgressStore.data$;
  loading$ = this.sprintProgressStore.loading$;
  error$ = this.sprintProgressStore.error$;
  hasFetched$ = this.sprintProgressStore.hasFetched$;
  lastLoaded$ = this.sprintProgressStore.lastLoaded$;

  burndownData: ChartConfiguration<'line'>['data'] = { labels: [], datasets: [] };
  burndownOptions: ChartConfiguration<'line'>['options'] = {};

  stateBreakdownData: ChartConfiguration<'doughnut'>['data'] = { labels: [], datasets: [] };
  stateBreakdownOptions: ChartConfiguration<'doughnut'>['options'] = {};

  stateColors: Record<string, string> = {
    New: '#94a3b8',
    Active: '#3b82f6',
    Resolved: '#10b981',
    Closed: '#22c55e',
    Blocked: '#ef4444',
    Other: '#64748b',
  };

  constructor(
    private teamStore: TeamStoreService,
    private sprintProgressStore: SprintProgressStoreService,
  ) {}

  ngOnInit(): void {
    this.teamStore.current$
      .pipe(takeUntil(this.destroy$))
      .subscribe((team: TeamDTO | null) => {
        if (team) {
          this.sprintProgressStore.fetch(team.id);
        }
      });

    this.data$.pipe(takeUntil(this.destroy$)).subscribe((data: SprintProgressData | null) => {
      if (data) {
        this.updateCharts(data);
      }
    });
  }

  ngOnDestroy(): void {
    this.destroy$.next();
    this.destroy$.complete();
  }

  refresh(): void {
    const team = this.teamStore.getCurrentSync();
    if (team) {
      this.sprintProgressStore.fetch(team.id, undefined, true);
    }
  }

  private updateCharts(data: SprintProgressData): void {
    this.updateBurndownChart(data);
    this.updateStateBreakdownChart(data);
  }

  private updateBurndownChart(data: SprintProgressData): void {
    const ideal = data.burndown.ideal;
    const actual = data.burndown.actualToday;

    const labels = ideal.map((p) => this.formatDateLabel(p.day));
    const idealValues = ideal.map((p) => p.sp);

    // Single point for today's actual
    const actualLabels = [this.formatDateLabel(actual.day)];
    const actualValues = [actual.sp];

    this.burndownData = {
      labels,
      datasets: [
        {
          label: 'Ideal',
          data: idealValues,
          borderColor: '#9ca3af',
          backgroundColor: 'transparent',
          borderWidth: 2,
          tension: 0.4,
          fill: false,
          pointRadius: 2,
        },
        {
          label: 'Today',
          data: actualValues,
          borderColor: '#3b82f6',
          backgroundColor: '#3b82f6',
          borderWidth: 3,
          pointRadius: 6,
          tension: 0,
          fill: false,
          showLine: false,
        },
      ],
    };

    this.burndownOptions = {
      responsive: true,
      maintainAspectRatio: true,
      interaction: { mode: 'index' as const, intersect: false },
      plugins: {
        legend: { display: true, position: 'top' as const },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#444',
          borderWidth: 1,
        },
      },
      scales: {
        y: {
          beginAtZero: true,
          ticks: { color: '#9ca3af' },
          grid: { color: '#374151' },
        },
        x: {
          ticks: { color: '#9ca3af' },
          grid: { display: false },
        },
      },
    };
  }

  private updateStateBreakdownChart(data: SprintProgressData): void {
    const states = data.stateBreakdown;
    const labels = states.map((s) => `${s.state} (${s.count})`);
    const values = states.map((s) => s.count);
    const colors = states.map((s) => this.stateColors[s.state] || this.stateColors['Other']);

    this.stateBreakdownData = {
      labels,
      datasets: [
        {
          data: values,
          backgroundColor: colors,
          borderColor: '#1f2937',
          borderWidth: 2,
        },
      ],
    };

    this.stateBreakdownOptions = {
      responsive: true,
      maintainAspectRatio: true,
      plugins: {
        legend: { display: true, position: 'bottom' as const },
        tooltip: {
          backgroundColor: 'rgba(0, 0, 0, 0.8)',
          padding: 12,
          titleColor: '#fff',
          bodyColor: '#fff',
          borderColor: '#444',
          borderWidth: 1,
          callbacks: {
            label: (context: any) => {
              const state = data.stateBreakdown[context.dataIndex];
              return `${state.state}: ${state.count} items, ${state.sp} SP`;
            },
          },
        },
      },
    };
  }

  private formatDateLabel(dateStr: string): string {
    const d = new Date(dateStr);
    return `${d.getMonth() + 1}/${d.getDate()}`;
  }

  formatLastLoaded(date: Date | null): string {
    if (!date) return '';
    return date.toLocaleTimeString();
  }
}
