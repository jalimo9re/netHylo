import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class SystemConfigService {
  constructor(private http: HttpClient) {}

  getAll() {
    return this.http.get<Record<string, any>>(`${environment.apiUrl}/system-config`);
  }

  setBulk(configs: Record<string, any>) {
    return this.http.post<any>(`${environment.apiUrl}/system-config/bulk`, configs);
  }
}
