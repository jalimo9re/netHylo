import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

export interface TestInput {
  key: string;
  label: string;
  placeholder?: string;
  required?: boolean;
}

export interface TestDefinition {
  key: string;
  label: string;
  description: string;
  inputs?: TestInput[];
}

export interface TestSuite {
  provider: string;
  label: string;
  tests: TestDefinition[];
}

export interface TestResult {
  test: string;
  success: boolean;
  message: string;
  details?: any;
  duration: number;
}

export interface TestIntegration {
  id: string;
  tenantId: string;
  provider: string;
  name: string;
  status: string;
  config: Record<string, any>;
  createdAt: string;
}

@Injectable({ providedIn: 'root' })
export class IntegrationTestingService {
  private baseUrl = '/api/integrations/testing';

  constructor(private http: HttpClient) {}

  getTestSuites(): Observable<TestSuite[]> {
    return this.http.get<TestSuite[]>(`${this.baseUrl}/suites`);
  }

  getAllIntegrations(): Observable<TestIntegration[]> {
    return this.http.get<TestIntegration[]>(`${this.baseUrl}/integrations`);
  }

  runTest(
    integrationId: string,
    testKey: string,
    params?: Record<string, any>,
  ): Observable<TestResult> {
    return this.http.post<TestResult>(
      `${this.baseUrl}/${integrationId}/run`,
      { testKey, params },
    );
  }
}
