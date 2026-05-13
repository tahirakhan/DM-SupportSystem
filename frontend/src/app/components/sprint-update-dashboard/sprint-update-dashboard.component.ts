import { Component, OnInit } from '@angular/core';
import { FormBuilder, FormGroup, Validators } from '@angular/forms';
import { AdoApiService } from '../../services/ado-api.service';
import { SprintUpdateStoreService } from '../../services/sprint-update-store.service';
import { SprintUpdateData, WeekView, SprintFeatureRow } from '../../models/sprint-update.model';

@Component({
  selector: 'app-sprint-update-dashboard',
  templateUrl: './sprint-update-dashboard.component.html',
  styleUrls: ['./sprint-update-dashboard.component.scss'],
})
export class SprintUpdateDashboardComponent implements OnInit {
  filterForm: FormGroup;
  areaPaths: string[] = [];
  iterationPaths: string[] = [];
  selectedView: WeekView = 'week1';
  manualOverride = false;

  data: SprintUpdateData | null = null;
  loading = false;
  error: string | null = null;
  hasFetched = false;
  lastLoaded: string | null = null;

  constructor(
    private fb: FormBuilder,
    private adoApi: AdoApiService,
    private storeService: SprintUpdateStoreService,
  ) {
    this.filterForm = this.fb.group({
      areaPath: ['', Validators.required],
      iterationPath: ['', Validators.required],
    });
  }

  ngOnInit(): void {
    this.loadAreaPaths();
    this.loadIterationPaths();
    this.subscribeToStore();
  }

  private loadAreaPaths(): void {
    this.adoApi.getAreaPaths().subscribe({
      next: (paths) => {
        this.areaPaths = paths;
      },
    });
  }

  private loadIterationPaths(): void {
    this.adoApi.getIterationPaths().subscribe({
      next: (paths) => {
        this.iterationPaths = paths;
      },
    });
  }

  private subscribeToStore(): void {
    this.storeService.data$.subscribe((data) => {
      this.data = data;
      if (data && !this.manualOverride) {
        this.selectedView = data.computedWeek;
      }
    });
    this.storeService.loading$.subscribe((loading) => {
      this.loading = loading;
    });
    this.storeService.error$.subscribe((error) => {
      this.error = error;
    });
    this.storeService.hasFetched$.subscribe((hasFetched) => {
      this.hasFetched = hasFetched;
    });
    this.storeService.lastLoaded$.subscribe((lastLoaded) => {
      this.lastLoaded = lastLoaded;
    });
  }

  loadSprintUpdate(): void {
    if (this.filterForm.invalid) {
      return;
    }
    const { areaPath, iterationPath } = this.filterForm.value;
    this.storeService.fetch(areaPath, iterationPath);
  }

  refreshSprintUpdate(): void {
    if (this.filterForm.invalid) {
      return;
    }
    const { areaPath, iterationPath } = this.filterForm.value;
    this.storeService.fetch(areaPath, iterationPath, true);
  }

  onTabChange(index: number): void {
    this.manualOverride = true;
    const views: WeekView[] = ['week1', 'week2', 'postSprint'];
    this.selectedView = views[index];
  }

  getSelectedTabIndex(): number {
    const views: WeekView[] = ['week1', 'week2', 'postSprint'];
    return views.indexOf(this.selectedView);
  }

  get week1Features(): SprintFeatureRow[] {
    return this.data?.features || [];
  }

  get week2Features(): SprintFeatureRow[] {
    return this.data?.features || [];
  }

  get carryoverFeatures(): SprintFeatureRow[] {
    return this.data?.postSprint.carryoverFeatures || [];
  }
}
