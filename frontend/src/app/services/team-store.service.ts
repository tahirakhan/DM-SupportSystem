import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';
import { AdoApiService } from './ado-api.service';
import { TeamDTO } from '../models/team.model';

@Injectable({ providedIn: 'root' })
export class TeamStoreService {
  private teamsSubject = new BehaviorSubject<TeamDTO[]>([]);
  private currentSubject = new BehaviorSubject<TeamDTO | null>(null);
  private loadingSubject = new BehaviorSubject<boolean>(false);

  teams$ = this.teamsSubject.asObservable();
  current$ = this.currentSubject.asObservable();
  loading$ = this.loadingSubject.asObservable();

  constructor(private api: AdoApiService) {}

  loadTeams(): void {
    const teams = this.teamsSubject.value;
    if (teams.length > 0) return; // Already loaded

    this.loadingSubject.next(true);
    this.api.getTeams().subscribe({
      next: (data: TeamDTO[]) => {
        this.teamsSubject.next(data);
        // Default to first team if none selected
        if (this.currentSubject.value === null && data.length > 0) {
          this.currentSubject.next(data[0]);
        }
        this.loadingSubject.next(false);
      },
      error: () => {
        this.loadingSubject.next(false);
      },
    });
  }

  setTeam(team: TeamDTO): void {
    this.currentSubject.next(team);
  }

  getCurrentSync(): TeamDTO | null {
    return this.currentSubject.value;
  }
}
