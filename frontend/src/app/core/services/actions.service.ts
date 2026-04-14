import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export interface ActionProviderField {
  key: string;
  label: string;
  type: 'text' | 'password' | 'select';
  required: boolean;
  help?: string;
  options?: { value: string; label: string }[];
}

export interface ActionSetupStep {
  title: string;
  description: string;
}

export interface ActionParam {
  key: string;
  label: string;
  type: 'string' | 'number' | 'date' | 'boolean' | 'select' | 'text';
  required: boolean;
  help?: string;
  options?: { value: string; label: string }[];
}

export interface ActionCapability {
  category: string;
  action: string;
  label: string;
  description: string;
  params: ActionParam[];
}

export interface ActionProviderSchema {
  label: string;
  fields: ActionProviderField[];
  setupGuide: ActionSetupStep[];
  capabilities: ActionCapability[];
}

export interface ActionIntegration {
  id: string;
  name: string;
  provider: string;
  status: string;
  config: Record<string, any>;
  createdAt: string;
  updatedAt: string;
}

export interface ActionResult {
  success: boolean;
  data?: any;
  error?: string;
}

@Injectable({ providedIn: 'root' })
export class ActionsService {
  private url = `${environment.apiUrl}/actions`;

  constructor(private http: HttpClient) {}

  getConfigSchema() {
    return this.http.get<Record<string, ActionProviderSchema>>(
      `${this.url}/providers/config-schema`,
    );
  }

  findAll() {
    return this.http.get<ActionIntegration[]>(this.url);
  }

  findOne(id: string) {
    return this.http.get<ActionIntegration>(`${this.url}/${id}`);
  }

  create(data: { name: string; provider: string; config: Record<string, any> }) {
    return this.http.post<ActionIntegration>(this.url, data);
  }

  update(id: string, data: Partial<ActionIntegration>) {
    return this.http.patch<ActionIntegration>(`${this.url}/${id}`, data);
  }

  remove(id: string) {
    return this.http.delete(`${this.url}/${id}`);
  }

  testConnection(id: string) {
    return this.http.post<ActionResult>(`${this.url}/${id}/test`, {});
  }

  getCapabilities(id: string) {
    return this.http.get<ActionCapability[]>(`${this.url}/${id}/capabilities`);
  }

  executeAction(id: string, category: string, action: string, params: Record<string, any>) {
    return this.http.post<ActionResult>(`${this.url}/${id}/execute`, {
      category,
      action,
      params,
    });
  }
}
