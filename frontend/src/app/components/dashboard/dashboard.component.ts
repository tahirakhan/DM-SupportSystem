import { Component, OnInit, OnDestroy } from '@angular/core';
import {
  trigger, transition, style, animate, query, stagger, keyframes,
} from '@angular/animations';
import { Subscription } from 'rxjs';
import { ConfigService } from '../../services/config.service';
import { FeatureStoreService } from '../../services/feature-store.service';
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
export class DashboardComponent implements OnInit, OnDestroy {
  features: FeatureDTO[] = [];
  loading    = false;
  error: string | null = null;
  hasFetched = false;
  lastLoaded: Date | null = null;
  fetchCount = 0;

  private subs = new Subscription();

  constructor(
    private configService: ConfigService,
    private featureStore: FeatureStoreService,
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
    this.fetchCount++;
    this.featureStore.fetch(areaPath, iterationPath, true);
  }

  get summary() {
    const f = this.features;
    const totalStories    = f.reduce((s, x) => s + x.totalStories, 0);
    const totalPoints     = f.reduce((s, x) => s + x.totalPoints, 0);
    const doneCount       = f.reduce((s, x) => s + x.stateCounts.readyForProd + x.stateCounts.closed, 0);
    const donePoints      = f.reduce((s, x) => s + x.donePoints, 0);
    const inProgressCount = f.reduce((s, x) =>
      s + x.stateCounts.inDevelopment + x.stateCounts.devComplete + x.stateCounts.readyForQA +
          x.stateCounts.sprintReady + x.stateCounts.inRefinement + x.stateCounts.readyForRefine +
          x.stateCounts.inAnalysis, 0);
    const activePoints    = f.reduce((s, x) => s + x.activePoints, 0);
    const blockedCount    = f.reduce((s, x) => s + x.stateCounts.blocked, 0);
    const withStories     = f.filter(x => x.totalStories > 0).length;
    const noStories       = f.length - withStories;
    const donePct         = totalStories > 0 ? Math.round((doneCount / totalStories) * 100) : 0;
    return { totalStories, totalPoints, doneCount, donePoints, inProgressCount,
             activePoints, blockedCount, withStories, noStories, donePct,
             totalFeatures: f.length };
  }
}
