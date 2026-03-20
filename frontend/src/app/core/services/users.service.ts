import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface User {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  role: string;
  isActive: boolean;
  tenantId: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateUserDto {
  email: string;
  password: string;
  firstName: string;
  lastName: string;
  role?: string;
}

@Injectable({ providedIn: 'root' })
export class UsersService {
  private url = `${environment.apiUrl}/users`;

  constructor(private http: HttpClient) {}

  findAll() {
    return this.http.get<User[]>(this.url);
  }

  findOne(id: string) {
    return this.http.get<User>(`${this.url}/${id}`);
  }

  create(data: CreateUserDto) {
    return this.http.post<User>(this.url, data);
  }

  update(id: string, data: Partial<User>) {
    return this.http.patch<User>(`${this.url}/${id}`, data);
  }
}
