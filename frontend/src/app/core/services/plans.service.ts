import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface Plan {
  id: string;
  name: string;
  maxUsers: number;
  maxIntegrations: number;
  price: number;
}

@Injectable({ providedIn: 'root' })
export class PlansService {
  private url = `${environment.apiUrl}/plans`;

  constructor(private http: HttpClient) {}

  findAll() {
    return this.http.get<Plan[]>(this.url);
  }

  update(id: string, data: Partial<Plan>) {
    return this.http.patch<Plan>(`${this.url}/${id}`, data);
  }
}
