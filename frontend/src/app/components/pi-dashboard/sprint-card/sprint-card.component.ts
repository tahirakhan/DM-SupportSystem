import { Component, Input } from '@angular/core';
import { SprintSummary } from '../../../models/pi.model';

@Component({
  selector: 'app-sprint-card',
  templateUrl: './sprint-card.component.html',
  styleUrls: ['./sprint-card.component.scss'],
})
export class SprintCardComponent {
  @Input() sprint!: SprintSummary;

  get statusColor(): string {
    return { complete: '#00e676', 'on-track': '#448aff', 'at-risk': '#ff9100', 'not-started': '#546e7a' }[this.sprint.status];
  }

  get statusLabel(): string {
    return { complete: 'Complete', 'on-track': 'On Track', 'at-risk': 'At Risk', 'not-started': 'Not Started' }[this.sprint.status];
  }

  get doneWidth(): number {
    if (!this.sprint.totalStories) return 0;
    return Math.round((this.sprint.doneStories / this.sprint.totalStories) * 100);
  }

  get activeWidth(): number {
    if (!this.sprint.totalStories) return 0;
    return Math.round((this.sprint.activeStories / this.sprint.totalStories) * 100);
  }

  get blockedWidth(): number {
    if (!this.sprint.totalStories) return 0;
    return Math.round((this.sprint.blockedStories / this.sprint.totalStories) * 100);
  }

  formatDate(iso?: string): string {
    if (!iso) return '';
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
