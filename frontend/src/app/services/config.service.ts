import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject } from 'rxjs';
import { environment } from '../../environments/environment';

export interface FilterConfig {
  areaPath: string;
  iterationPath: string;
}

interface BackendConfig {
  defaultAreaPath: string;
  defaultIterationPath: string;
  iterationPaths: string[];
  areaPaths: string[];
}

const STORAGE_KEY = 'ado-dashboard-filters';

@Injectable({ providedIn: 'root' })
export class ConfigService {
  private filtersSubject = new BehaviorSubject<FilterConfig | null>(null);
  private areaPathsSubject = new BehaviorSubject<string[]>([]);
  private iterationPathsSubject = new BehaviorSubject<string[]>([]);

  readonly filters$ = this.filtersSubject.asObservable();
  readonly areaPaths$ = this.areaPathsSubject.asObservable();
  readonly iterationPaths$ = this.iterationPathsSubject.asObservable();

  constructor(private http: HttpClient) {}

  get currentFilters(): FilterConfig {
    return this.filtersSubject.value!;
  }

  init(): Promise<void> {
    return this.http
      .get<BackendConfig>(`${environment.apiUrl}/config`)
      .toPromise()
      .then(remote => {
        this.areaPathsSubject.next(remote!.areaPaths ?? [remote!.defaultAreaPath]);
        this.iterationPathsSubject.next(remote!.iterationPaths ?? [remote!.defaultIterationPath]);

        const stored = this.loadFromStorage();
        const config: FilterConfig = {
          areaPath: stored?.areaPath ?? remote!.defaultAreaPath,
          iterationPath: stored?.iterationPath ?? remote!.defaultIterationPath,
        };
        this.filtersSubject.next(config);
        this.saveToStorage(config);
      })
      .catch(() => {
        const stored = this.loadFromStorage();
        if (stored) this.filtersSubject.next(stored);
      });
  }

  updateAreaPath(areaPath: string): void {
    const updated: FilterConfig = { ...this.currentFilters, areaPath };
    this.filtersSubject.next(updated);
    this.saveToStorage(updated);
  }

  updateIterationPath(iterationPath: string): void {
    const updated: FilterConfig = { ...this.currentFilters, iterationPath };
    this.filtersSubject.next(updated);
    this.saveToStorage(updated);
  }

  private loadFromStorage(): FilterConfig | null {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      if (stored) return JSON.parse(stored) as FilterConfig;
    } catch {
      // ignore
    }
    return null;
  }

  private saveToStorage(config: FilterConfig): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(config));
  }
}
