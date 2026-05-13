import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AdoApiService } from './ado-api.service';
import { SprintUpdateData } from '../models/sprint-update.model';

@Injectable({ providedIn: 'root' })
export class SprintUpdateStoreService {
  private dataSubject = new BehaviorSubject<SprintUpdateData | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private hasFetchedSubject = new BehaviorSubject<boolean>(false);
  private lastLoadedSubject = new BehaviorSubject<string | null>(null);

  readonly data$ = this.dataSubject.asObservable();
  readonly loading$ = this.loadingSubject.asObservable();
  readonly error$ = this.errorSubject.asObservable();
  readonly hasFetched$ = this.hasFetchedSubject.asObservable();
  readonly lastLoaded$ = this.lastLoadedSubject.asObservable();

  private lastAreaPath: string | null = null;
  private lastIterationPath: string | null = null;

  constructor(private adoApi: AdoApiService) {}

  fetch(areaPath: string, iterationPath: string, force: boolean = false): void {
    if (!force && this.hasFetchedSubject.value && this.lastAreaPath === areaPath && this.lastIterationPath === iterationPath) {
      return;
    }

    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    this.adoApi.getSprintUpdate(areaPath, iterationPath).subscribe({
      next: (data) => {
        this.dataSubject.next(data);
        this.lastAreaPath = areaPath;
        this.lastIterationPath = iterationPath;
        this.hasFetchedSubject.next(true);
        this.lastLoadedSubject.next(new Date().toLocaleString());
        this.loadingSubject.next(false);
      },
      error: (err) => {
        this.errorSubject.next(err?.message || 'Failed to load sprint update');
        this.loadingSubject.next(false);
      }
    });
  }

  reset(): void {
    this.dataSubject.next(null);
    this.loadingSubject.next(false);
    this.errorSubject.next(null);
    this.hasFetchedSubject.next(false);
    this.lastLoadedSubject.next(null);
    this.lastAreaPath = null;
    this.lastIterationPath = null;
  }
}
