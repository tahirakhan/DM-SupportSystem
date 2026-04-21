import { Component, Input } from '@angular/core';
import { FeatureDTO, StateCount } from '../../models/feature.model';

interface StateConfig {
  key: keyof StateCount;
  label: string;
  color: string;
  bg: string;
}

interface BarSegment {
  pct: number;
  count: number;
  color: string;
  tooltip: string;
}

@Component({
  selector: 'app-feature-card',
  templateUrl: './feature-card.component.html',
  styleUrls: ['./feature-card.component.scss'],
})
export class FeatureCardComponent {
  @Input() feature!: FeatureDTO;

  readonly stateConfig: StateConfig[] = [
    { key: 'new',            label: 'New / To Do',      color: '#78909c', bg: '#eceff1' },
    { key: 'inAnalysis',     label: 'In Analysis',      color: '#0288d1', bg: '#e1f5fe' },
    { key: 'readyForRefine', label: 'Ready for Refine', color: '#f57c00', bg: '#fff3e0' },
    { key: 'inRefinement',   label: 'In Refinement',    color: '#ef6c00', bg: '#fbe9e7' },
    { key: 'sprintReady',    label: 'Sprint Ready',     color: '#00796b', bg: '#e0f2f1' },
    { key: 'inDevelopment',  label: 'In Development',   color: '#1976d2', bg: '#e3f2fd' },
    { key: 'devComplete',    label: 'Dev Complete',     color: '#5e35b1', bg: '#ede7f6' },
    { key: 'readyForQA',     label: 'Ready for QA',     color: '#8e24aa', bg: '#f3e5f5' },
    { key: 'readyForProd',   label: 'Ready for Prod',   color: '#388e3c', bg: '#e8f5e9' },
    { key: 'closed',         label: 'Closed',           color: '#2e7d32', bg: '#c8e6c9' },
    { key: 'blocked',        label: 'Blocked',          color: '#e53935', bg: '#ffebee' },
  ];

  get pctClass(): string {
    const p = this.feature.percentComplete;
    if (p === 100) return 'pct-done';
    if (p >= 60)   return 'pct-good';
    if (p >= 30)   return 'pct-mid';
    return 'pct-low';
  }

  get featureStateClass(): string {
    const s = this.feature.state.toLowerCase();
    if (s.includes('active'))   return 'fs-active';
    if (s.includes('resolved')) return 'fs-resolved';
    if (s.includes('closed'))   return 'fs-closed';
    if (s.includes('removed'))  return 'fs-removed';
    return 'fs-default';
  }

  count(key: keyof StateCount): number {
    return this.feature.stateCounts?.[key] ?? 0;
  }

  get doneCount(): number {
    return this.count('readyForProd') + this.count('closed');
  }

  // ── Stories bar: one segment per state (skips zero-count states) ──

  get itemsBar(): BarSegment[] {
    const total = this.feature.totalStories;
    if (total === 0) return [{ pct: 100, count: 0, color: '#e0e0e0', tooltip: 'No stories' }];

    const segments: BarSegment[] = [];
    for (const s of this.stateConfig) {
      const cnt = this.count(s.key);
      if (cnt === 0) continue;
      segments.push({
        pct: Math.round((cnt / total) * 100),
        count: cnt,
        color: s.color,
        tooltip: `${s.label}: ${cnt}`,
      });
    }

    // Fix rounding so segments always fill the bar
    const sum = segments.reduce((acc, s) => acc + s.pct, 0);
    if (segments.length && sum < 100) segments[0].pct += (100 - sum);

    return segments;
  }

  // ── Points bar: grouped (done / active / not-started / blocked) ──

  get notStartedPoints(): number {
    return Math.max(0, this.feature.totalPoints - this.feature.donePoints -
                       this.feature.activePoints - this.feature.blockedPoints);
  }

  get pointsBar(): BarSegment[] {
    const total = this.feature.totalPoints;
    if (total === 0) return [{ pct: 100, count: 0, color: '#e0e0e0', tooltip: 'No points' }];

    const pct = (n: number) => Math.round((n / total) * 100);
    const segments: BarSegment[] = [];

    const { donePoints, activePoints, blockedPoints } = this.feature;
    const ns = this.notStartedPoints;

    if (donePoints > 0)    segments.push({ pct: pct(donePoints),    count: donePoints,    color: '#2e7d32', tooltip: `Done: ${donePoints} pts` });
    if (activePoints > 0)  segments.push({ pct: pct(activePoints),  count: activePoints,  color: '#1976d2', tooltip: `In Progress: ${activePoints} pts` });
    if (ns > 0)            segments.push({ pct: pct(ns),            count: ns,            color: '#90a4ae', tooltip: `Not Started: ${ns} pts` });
    if (blockedPoints > 0) segments.push({ pct: pct(blockedPoints), count: blockedPoints, color: '#e53935', tooltip: `Blocked: ${blockedPoints} pts` });

    const sum = segments.reduce((acc, s) => acc + s.pct, 0);
    if (segments.length && sum < 100) segments[0].pct += (100 - sum);

    return segments;
  }

  // ── Legends ───────────────────────────────────────────────

  get activeLegend(): StateConfig[] {
    return this.stateConfig.filter(s => this.count(s.key) > 0);
  }

  get pointsLegend(): { color: string; label: string; value: number }[] {
    const { donePoints, activePoints, blockedPoints } = this.feature;
    const ns = this.notStartedPoints;
    return [
      { color: '#2e7d32', label: 'Done',        value: donePoints },
      { color: '#1976d2', label: 'In Progress',  value: activePoints },
      { color: '#90a4ae', label: 'Not Started',  value: ns },
      { color: '#e53935', label: 'Blocked',      value: blockedPoints },
    ].filter(e => e.value > 0);
  }
}
