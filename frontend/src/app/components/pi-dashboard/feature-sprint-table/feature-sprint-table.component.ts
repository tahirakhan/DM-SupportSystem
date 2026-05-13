import { Component, Input } from '@angular/core';
import { PiFeatureRow, SprintSummary, FeatureSprintCell } from '../../../models/pi.model';

@Component({
  selector: 'app-feature-sprint-table',
  templateUrl: './feature-sprint-table.component.html',
  styleUrls: ['./feature-sprint-table.component.scss'],
})
export class FeatureSprintTableComponent {
  @Input() features: PiFeatureRow[] = [];
  @Input() sprints: SprintSummary[] = [];

  getCell(feature: PiFeatureRow, sprint: SprintSummary): FeatureSprintCell {
    return feature.sprints[sprint.path] ?? { total: 0, done: 0, points: 0, donePoints: 0 };
  }

  pctClass(pct: number): string {
    if (pct === 100) return 'pct-done';
    if (pct >= 70)   return 'pct-good';
    if (pct >= 40)   return 'pct-mid';
    return 'pct-low';
  }

  featureStateClass(state: string): string {
    const s = state.toLowerCase();
    if (s === 'active' || s === 'in progress')                  return 'fs-active';
    if (s === 'resolved' || s === 'done' || s === 'closed')     return 'fs-resolved';
    if (s === 'closed')                                          return 'fs-closed';
    return 'fs-default';
  }

  cellClass(cell: FeatureSprintCell): string {
    if (!cell.total) return '';
    const pct = Math.round((cell.done / cell.total) * 100);
    if (pct === 100) return 'cell-done';
    if (pct >= 50)   return 'cell-partial';
    return 'cell-low';
  }
}
