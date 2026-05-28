import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class ContactsService {
  private url = `${environment.apiUrl}/contacts`;

  constructor(private http: HttpClient) {}

  findAll() {
    return this.http.get<any[]>(this.url);
  }
}
