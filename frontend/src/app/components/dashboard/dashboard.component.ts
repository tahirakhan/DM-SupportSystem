import { Component } from '@angular/core';
import {
  trigger, transition, style, animate, query, stagger, keyframes,
} from '@angular/animations';
import { AdoApiService } from '../../services/ado-api.service';
import { ConfigService } from '../../services/config.service';
import { FeatureDTO } from '../../models/feature.model';

@Component({
  selector: 'app-dashboard',
  templateUrl: './dashboard.component.html',
  styleUrls: ['./dashboard.component.scss'],
  animations: [
    trigger('cardStagger', [
      transition('* => *', [
        query(':enter', [
          style({ opacity: 0, transform: 'translateY(24px)' }),
          stagger(45, animate('320ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))),
        ], { optional: true }),
      ]),
    ]),
    trigger('btnPulse', [
      transition(':increment', animate('240ms', keyframes([
        style({ transform: 'scale(0.93)', offset: 0 }),
        style({ transform: 'scale(1.04)', offset: 0.6 }),
        style({ transform: 'scale(1)',    offset: 1 }),
      ]))),
    ]),
  ],
})
export class DashboardComponent {
  features: FeatureDTO[] = [];
  loading = false;
  error: string | null = null;
  hasFetched = false;
  lastLoaded: Date | null = null;
  fetchCount = 0;

  constructor(
    private adoApiService: AdoApiService,
    private configService: ConfigService,
  ) {}

  get summary() {
    const f = this.features;
    const totalStories   = f.reduce((s, x) => s + x.totalStories, 0);
    const totalPoints    = f.reduce((s, x) => s + x.totalPoints, 0);
    const doneCount      = f.reduce((s, x) => s + x.stateCounts.readyForProd + x.stateCounts.closed, 0);
    const donePoints     = f.reduce((s, x) => s + x.donePoints, 0);
    const inProgressCount = f.reduce((s, x) =>
      s + x.stateCounts.inDevelopment + x.stateCounts.devComplete + x.stateCounts.readyForQA +
          x.stateCounts.sprintReady + x.stateCounts.inRefinement + x.stateCounts.readyForRefine +
          x.stateCounts.inAnalysis, 0);
    const activePoints   = f.reduce((s, x) => s + x.activePoints, 0);
    const blockedCount   = f.reduce((s, x) => s + x.stateCounts.blocked, 0);
    const withStories    = f.filter(x => x.totalStories > 0).length;
    const noStories      = f.length - withStories;
    const donePct        = totalStories > 0 ? Math.round((doneCount / totalStories) * 100) : 0;
    return { totalStories, totalPoints, doneCount, donePoints, inProgressCount,
             activePoints, blockedCount, withStories, noStories, donePct,
             totalFeatures: f.length };
  }

  fetch(): void {
    const { areaPath, iterationPath } = this.configService.currentFilters;
    this.fetchCount++;
    this.loading = true;
    this.error = null;
    this.features = [];

    this.adoApiService.getFeatures(areaPath, iterationPath).subscribe({
      next: features => {
        this.features = features.slice().sort((a, b) => b.totalStories - a.totalStories);
        this.loading = false;
        this.hasFetched = true;
        this.lastLoaded = new Date();
      },
      error: err => {
        this.error =
          err?.error?.message ??
          err?.message ??
          'Failed to load features from Azure DevOps.';
        this.loading = false;
        this.hasFetched = true;
      },
    });
  }
}
