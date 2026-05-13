import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { AdoApiService } from './ado-api.service';
import { PiData } from '../models/pi.model';

interface PiFilter { areaPath: string; iterationPath: string; }

@Injectable({ providedIn: 'root' })
export class PiStoreService {
  private dataSubject      = new BehaviorSubject<PiData | null>(null);
  private loadingSubject   = new BehaviorSubject<boolean>(false);
  private errorSubject     = new BehaviorSubject<string | null>(null);
  private hasFetchedSubject = new BehaviorSubject<boolean>(false);
  private lastLoadedSubject = new BehaviorSubject<Date | null>(null);
  private currentFilter: PiFilter | null = null;

  data$       = this.dataSubject.asObservable();
  loading$    = this.loadingSubject.asObservable();
  error$      = this.errorSubject.asObservable();
  hasFetched$ = this.hasFetchedSubject.asObservable();
  lastLoaded$ = this.lastLoadedSubject.asObservable();

  constructor(private api: AdoApiService) {}

  fetch(areaPath: string, iterationPath: string, force = false): void {
    const isSame =
      this.currentFilter?.areaPath === areaPath &&
      this.currentFilter?.iterationPath === iterationPath;

    if (!force && isSame && this.dataSubject.value !== null) return;

    this.currentFilter = { areaPath, iterationPath };
    this.loadingSubject.next(true);
    this.errorSubject.next(null);

    this.api.getPiData(areaPath, iterationPath).subscribe({
      next: data => {
        this.dataSubject.next(data);
        this.hasFetchedSubject.next(true);
        this.lastLoadedSubject.next(new Date());
        this.loadingSubject.next(false);
      },
      error: err => {
        const msg = err?.error?.message ?? err?.message ?? 'Failed to load PI data.';
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
    this.currentFilter = null;
  }
}
