import { Component, OnInit, OnDestroy } from '@angular/core';
import { FormControl, FormGroup, Validators } from '@angular/forms';
import { Subscription } from 'rxjs';
import { PiStoreService } from '../../services/pi-store.service';
import { AdoApiService } from '../../services/ado-api.service';
import { PiData, SprintSummary } from '../../models/pi.model';

@Component({
  selector: 'app-pi-dashboard',
  templateUrl: './pi-dashboard.component.html',
  styleUrls: ['./pi-dashboard.component.scss'],
})
export class PiDashboardComponent implements OnInit, OnDestroy {
  loading   = false;
  error: string | null = null;
  hasFetched = false;
  lastLoaded: Date | null = null;
  piData: PiData | null = null;

  areaPaths: string[]      = [];
  iterationPaths: string[] = [];
  pathsLoading = true;

  filterForm = new FormGroup({
    areaPath:      new FormControl('', Validators.required),
    iterationPath: new FormControl('', Validators.required),
  });

  private subs = new Subscription();

  constructor(
    private store: PiStoreService,
    private api: AdoApiService,
  ) {}

  ngOnInit(): void {
    this.subs.add(this.store.loading$.subscribe(v    => (this.loading    = v)));
    this.subs.add(this.store.error$.subscribe(v      => (this.error      = v)));
    this.subs.add(this.store.hasFetched$.subscribe(v => (this.hasFetched = v)));
    this.subs.add(this.store.lastLoaded$.subscribe(v => (this.lastLoaded = v)));
    this.subs.add(this.store.data$.subscribe(d       => (this.piData     = d)));

    this.api.getAreaPaths().subscribe({
      next: paths => { this.areaPaths = paths; this.checkPathsLoaded(); },
      error: ()   => { this.areaPaths = []; this.checkPathsLoaded(); },
    });
    this.api.getIterationPaths().subscribe({
      next: paths => { this.iterationPaths = paths; this.checkPathsLoaded(); },
      error: ()   => { this.iterationPaths = []; this.checkPathsLoaded(); },
    });
  }

  private checkPathsLoaded(): void {
    if (this.areaPaths.length >= 0 && this.iterationPaths.length >= 0) {
      this.pathsLoading = false;
    }
  }

  ngOnDestroy(): void { this.subs.unsubscribe(); }

  fetch(): void {
    if (this.filterForm.invalid) return;
    const { areaPath, iterationPath } = this.filterForm.value;
    this.store.fetch(areaPath!, iterationPath!, true);
  }

  refresh(): void { this.fetch(); }

  get sprints(): SprintSummary[] { return this.piData?.sprints ?? []; }
  get summary() { return this.piData?.summary; }
  get features() { return this.piData?.features ?? []; }
  get burnup() { return this.piData?.burnup ?? []; }
  get piName(): string { return this.piData?.piName ?? ''; }

  sprintStatusColor(status: SprintSummary['status']): string {
    return { complete: '#00e676', 'on-track': '#448aff', 'at-risk': '#ff9100', 'not-started': '#546e7a' }[status];
  }

  sprintStatusLabel(status: SprintSummary['status']): string {
    return { complete: 'Complete', 'on-track': 'On Track', 'at-risk': 'At Risk', 'not-started': 'Not Started' }[status];
  }

  formatDate(iso?: string): string {
    if (!iso) return '';
    const d = new Date(iso);
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  }
}
