import { Component, OnInit, OnDestroy } from '@angular/core';
import { Subscription } from 'rxjs';
import { ConfigService } from '../../services/config.service';
import { FeatureStoreService } from '../../services/feature-store.service';
import { FeatureDTO, StateCount } from '../../models/feature.model';

export interface ReadinessGroup {
  label: string;
  icon: string;
  iconColor: string;
  features: FeatureDTO[];
}

@Component({
  selector: 'app-release-dashboard',
  templateUrl: './release-dashboard.component.html',
  styleUrls: ['./release-dashboard.component.scss'],
})
export class ReleaseDashboardComponent implements OnInit, OnDestroy {
  features: FeatureDTO[] = [];
  loading    = false;
  error: string | null = null;
  hasFetched = false;
  lastLoaded: Date | null = null;

  private subs = new Subscription();

  constructor(
    private configService: ConfigService,
    public featureStore: FeatureStoreService,
  ) {}

  ngOnInit(): void {
    this.subs.add(this.featureStore.features$.subscribe(f  => { this.features   = f; }));
    this.subs.add(this.featureStore.loading$.subscribe(l   => { this.loading     = l; }));
    this.subs.add(this.featureStore.error$.subscribe(e     => { this.error       = e; }));
    this.subs.add(this.featureStore.hasFetched$.subscribe(h => { this.hasFetched = h; }));
    this.subs.add(this.featureStore.lastLoaded$.subscribe(d => { this.lastLoaded = d; }));
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
  }

  fetch(): void {
    const { areaPath, iterationPath } = this.configService.currentFilters;
    this.featureStore.fetch(areaPath, iterationPath, true);
  }

  // ── Summary ───────────────────────────────────────────────

  get summary() {
    const f = this.features;
    const totalStories = f.reduce((s, x) => s + x.totalStories, 0);
    const totalPoints  = f.reduce((s, x) => s + x.totalPoints, 0);
    const doneCount    = f.reduce((s, x) => s + x.stateCounts.readyForProd + x.stateCounts.closed, 0);
    const donePoints   = f.reduce((s, x) => s + x.donePoints, 0);
    const blockedCount = f.reduce((s, x) => s + x.stateCounts.blocked, 0);
    const withStories  = f.filter(x => x.totalStories > 0).length;
    const donePct      = totalStories > 0 ? Math.round((doneCount / totalStories) * 100) : 0;
    const ptsPct       = totalPoints  > 0 ? Math.round((donePoints / totalPoints) * 100)  : 0;
    return { totalStories, totalPoints, doneCount, donePoints, blockedCount,
             withStories, donePct, ptsPct, totalFeatures: f.length };
  }

  // ── Release readiness groups ──────────────────────────────

  get readinessGroups(): ReadinessGroup[] {
    const ready      = this.features.filter(f => f.totalStories > 0 && f.percentComplete === 100);
    const onTrack    = this.features.filter(f => f.totalStories > 0 && f.percentComplete >= 50 && f.percentComplete < 100);
    const atRisk     = this.features.filter(f => f.totalStories > 0 && f.percentComplete < 50);
    const noStories  = this.features.filter(f => f.totalStories === 0);
    return [
      { label: 'Ready to Release', icon: 'check_circle', iconColor: '#2e7d32', features: ready },
      { label: 'On Track',         icon: 'trending_up',  iconColor: '#1565c0', features: onTrack },
      { label: 'At Risk',          icon: 'warning',      iconColor: '#e65100', features: atRisk },
      { label: 'No Stories',       icon: 'inbox',        iconColor: '#9e9e9e', features: noStories },
    ];
  }

  // ── State distribution bar (all stories combined) ─────────

  readonly stateOrder: { key: keyof StateCount; label: string; color: string }[] = [
    { key: 'closed',         label: 'Closed',           color: '#2e7d32' },
    { key: 'readyForProd',   label: 'Ready for Prod',   color: '#388e3c' },
    { key: 'readyForQA',     label: 'Ready for QA',     color: '#8e24aa' },
    { key: 'devComplete',    label: 'Dev Complete',      color: '#5e35b1' },
    { key: 'inDevelopment',  label: 'In Development',   color: '#1976d2' },
    { key: 'sprintReady',    label: 'Sprint Ready',      color: '#00796b' },
    { key: 'inRefinement',   label: 'In Refinement',    color: '#ef6c00' },
    { key: 'readyForRefine', label: 'Ready for Refine', color: '#f57c00' },
    { key: 'inAnalysis',     label: 'In Analysis',      color: '#0288d1' },
    { key: 'new',            label: 'New / To Do',      color: '#78909c' },
    { key: 'blocked',        label: 'Blocked',          color: '#e53935' },
  ];

  get stateDistribution(): { key: string; label: string; color: string; count: number; pct: number }[] {
    const total = this.features.reduce((s, f) => s + f.totalStories, 0);
    if (total === 0) return [];
    return this.stateOrder
      .map(s => ({
        key: s.key,
        label: s.label,
        color: s.color,
        count: this.features.reduce((sum, f) => sum + (f.stateCounts[s.key] ?? 0), 0),
        pct: 0,
      }))
      .filter(s => s.count > 0)
      .map(s => ({ ...s, pct: Math.round((s.count / total) * 100) }));
  }

  // ── Table helpers ─────────────────────────────────────────

  featureStateClass(f: FeatureDTO): string {
    const s = f.state.toLowerCase();
    if (s.includes('active'))   return 'fs-active';
    if (s.includes('resolved')) return 'fs-resolved';
    if (s.includes('closed'))   return 'fs-closed';
    if (s.includes('removed'))  return 'fs-removed';
    return 'fs-default';
  }

  doneCount(f: FeatureDTO): number {
    return (f.stateCounts.readyForProd ?? 0) + (f.stateCounts.closed ?? 0);
  }

  blockedCount(f: FeatureDTO): number {
    return f.stateCounts.blocked ?? 0;
  }

  pctClass(f: FeatureDTO): string {
    if (f.percentComplete === 100) return 'pct-done';
    if (f.percentComplete >= 60)   return 'pct-good';
    if (f.percentComplete >= 30)   return 'pct-mid';
    return 'pct-low';
  }
}
