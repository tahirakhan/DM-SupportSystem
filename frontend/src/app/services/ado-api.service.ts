import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FeatureDTO } from '../models/feature.model';
import { PiData } from '../models/pi.model';
import { TeamDTO } from '../models/team.model';
import { SprintProgressData } from '../models/sprint-progress.model';

@Injectable({ providedIn: 'root' })
export class AdoApiService {
  private readonly base = environment.apiUrl;

  constructor(private http: HttpClient) {}

  getFeatures(areaPath: string, iterationPath: string): Observable<FeatureDTO[]> {
    const params = new HttpParams()
      .set('areaPath', areaPath)
      .set('iterationPath', iterationPath);
    return this.http.get<FeatureDTO[]>(`${this.base}/features`, { params });
  }

  getIterationPaths(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/iterations`);
  }

  getPiIterationPaths(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/pi-iterations`);
  }

  getAreaPaths(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/areas`);
  }

  getPiData(areaPath: string, iterationPath: string): Observable<PiData> {
    const params = new HttpParams()
      .set('areaPath', areaPath)
      .set('iterationPath', iterationPath);
    return this.http.get<PiData>(`${this.base}/pi`, { params });
  }

  getTeams(): Observable<TeamDTO[]> {
    return this.http.get<TeamDTO[]>(`${this.base}/teams`);
  }

  getSprintProgress(teamId: string, sprintId?: string, refresh = false): Observable<SprintProgressData> {
    let params = new HttpParams().set('teamId', teamId);
    if (sprintId) {
      params = params.set('sprintId', sprintId);
    }
    if (refresh) {
      params = params.set('refresh', '1');
    }
    return this.http.get<SprintProgressData>(`${this.base}/dashboards/sprint-progress`, { params });
  }
}
