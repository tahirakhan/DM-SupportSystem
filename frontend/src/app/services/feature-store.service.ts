import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AdoApiService } from './ado-api.service';
import { FeatureDTO } from '../models/feature.model';

@Injectable({ providedIn: 'root' })
export class FeatureStoreService {
  private featuresSubject  = new BehaviorSubject<FeatureDTO[]>([]);
  private loadingSubject   = new BehaviorSubject<boolean>(false);
  private errorSubject     = new BehaviorSubject<string | null>(null);
  private hasFetchedSubject = new BehaviorSubject<boolean>(false);
  private lastLoadedSubject = new BehaviorSubject<Date | null>(null);
  private currentFilter: { areaPath: string; iterationPath: string } | null = null;

  readonly features$   = this.featuresSubject.asObservable();
  readonly loading$    = this.loadingSubject.asObservable();
  readonly error$      = this.errorSubject.asObservable();
  readonly hasFetched$ = this.hasFetchedSubject.asObservable();
  readonly lastLoaded$ = this.lastLoadedSubject.asObservable();

  constructor(private adoApi: AdoApiService) {}

  get currentFeatures(): FeatureDTO[] { return this.featuresSubject.value; }

  fetch(areaPath: string, iterationPath: string, force = false): void {
    const isSameFilter =
      this.currentFilter?.areaPath === areaPath &&
      this.currentFilter?.iterationPath === iterationPath;

    if (!force && isSameFilter && this.featuresSubject.value.length > 0) {
      return;
    }

    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    this.adoApi.getFeatures(areaPath, iterationPath).subscribe({
      next: features => {
        this.featuresSubject.next(
          features.slice().sort((a, b) => b.totalStories - a.totalStories)
        );
        this.loadingSubject.next(false);
        this.hasFetchedSubject.next(true);
        this.lastLoadedSubject.next(new Date());
        this.currentFilter = { areaPath, iterationPath };
      },
      error: err => {
        this.errorSubject.next(
          err?.error?.message ?? err?.message ?? 'Failed to load features from Azure DevOps.'
        );
        this.loadingSubject.next(false);
        this.hasFetchedSubject.next(true);
      },
    });
  }
}
