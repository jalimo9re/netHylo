import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ProviderField {
  key: string;
  label: string;
  type: 'text' | 'password';
  required: boolean;
  help: string;
}

export interface SetupStep {
  title: string;
  description: string;
}

export interface ProviderSchema {
  label: string;
  fields: ProviderField[];
  webhookUrl: string;
  setupNote?: string;
  setupGuide?: SetupStep[];
}

export interface Integration {
  id: string;
  name: string;
  provider: string;
  status: string;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

@Injectable({ providedIn: 'root' })
export class IntegrationsService {
  private url = `${environment.apiUrl}/integrations`;

  constructor(private http: HttpClient) {}

  getConfigSchema() {
    return this.http.get<Record<string, ProviderSchema>>(
      `${this.url}/providers/config-schema`,
    );
  }

  findAll() {
    return this.http.get<Integration[]>(this.url);
  }

  findOne(id: string) {
    return this.http.get<Integration>(`${this.url}/${id}`);
  }

  create(data: { name: string; provider: string; config: Record<string, any> }) {
    return this.http.post<Integration>(this.url, data);
  }

  update(id: string, data: Partial<Integration>) {
    return this.http.patch<Integration>(`${this.url}/${id}`, data);
  }

  remove(id: string) {
    return this.http.delete(`${this.url}/${id}`);
  }

  getOAuthUrl(type: 'messenger' | 'instagram') {
    return this.http.get<{ url: string }>(
      `${this.url}/oauth/meta/url?type=${type}`,
    );
  }

  createFromOAuth(data: {
    type: 'messenger' | 'instagram';
    pageId: string;
    pageName: string;
    pageAccessToken: string;
    igAccountId?: string;
    igUsername?: string;
  }) {
    return this.http.post<Integration>(
      `${this.url}/oauth/meta/create`,
      data,
    );
  }
}
