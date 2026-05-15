import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AdoApiService } from './ado-api.service';
import { SprintProgressData } from '../models/sprint-progress.model';

interface SprintProgressFilter {
  teamId: string;
  sprintId?: string;
}

@Injectable({ providedIn: 'root' })
export class SprintProgressStoreService {
  private dataSubject = new BehaviorSubject<SprintProgressData | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);
  private errorSubject = new BehaviorSubject<string | null>(null);
  private hasFetchedSubject = new BehaviorSubject<boolean>(false);
  private lastLoadedSubject = new BehaviorSubject<Date | null>(null);
  private currentFilter: SprintProgressFilter | null = null;

  data$ = this.dataSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();
  error$ = this.errorSubject.asObservable();
  hasFetched$ = this.hasFetchedSubject.asObservable();
  lastLoaded$ = this.lastLoadedSubject.asObservable();

  constructor(private api: AdoApiService) {}

  fetch(teamId: string, sprintId?: string, force = false): void {
    const isSame =
      this.currentFilter?.teamId === teamId &&
      this.currentFilter?.sprintId === sprintId;

    if (!force && isSame && this.hasFetchedSubject.value) return;

    this.currentFilter = { teamId, sprintId };
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    this.api.getSprintProgress(teamId, sprintId, force).subscribe({
      next: (data: SprintProgressData) => {
        this.dataSubject.next(data);
        this.hasFetchedSubject.next(true);
        this.lastLoadedSubject.next(new Date());
        this.loadingSubject.next(false);
      },
      error: (err) => {
        const msg = err?.error?.message ?? err?.message ?? 'Failed to load sprint progress data.';
        this.errorSubject.next(msg);
        this.hasFetchedSubject.next(true);
        this.loadingSubject.next(false);
      },
    });
  }

  reset(): void {
    this.dataSubject.next(null);
    this.hasFetchedSubject.next(false);
    this.errorSubject.next(null);
    this.lastLoadedSubject.next(null);
    this.currentFilter = null;
  }
}
