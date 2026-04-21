import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { Observable } from 'rxjs';
import { environment } from '../../environments/environment';
import { FeatureDTO } from '../models/feature.model';

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

  getAreaPaths(): Observable<string[]> {
    return this.http.get<string[]>(`${this.base}/areas`);
  }
}
