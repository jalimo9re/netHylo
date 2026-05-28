import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  IntegrationTestingService,
  TestSuite,
  TestDefinition,
  TestResult,
  TestIntegration,
} from '../../../core/services/integration-testing.service';

interface StoredResult {
  result: TestResult;
  timestamp: Date;
}

@Component({
  selector: 'app-integration-testing',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule, MatSelectModule, MatTooltipModule],
  templateUrl: './integration-testing.component.html',
})
export class IntegrationTestingComponent implements OnInit {
  suites: TestSuite[] = [];
  integrations: TestIntegration[] = [];
  loading = true;

  selectedProvider = '';
  selectedIntegrationId = '';

  // testKey → running state
  runningTests: Record<string, boolean> = {};
  // testKey → params
  testParams: Record<string, Record<string, any>> = {};
  // testKey → result
  testResults: Record<string, StoredResult> = {};

  providerIcons: Record<string, string> = {
    whatsapp: 'chat',
    meta: 'facebook',
    instagram: 'photo_camera',
    telegram: 'send',
    tiktok: 'music_note',
  };

  constructor(private testingService: IntegrationTestingService) {}

  ngOnInit() {
    this.testingService.getTestSuites().subscribe((suites) => {
      this.suites = suites;
      this.loading = false;
    });
    this.testingService.getAllIntegrations().subscribe((integrations) => {
      this.integrations = integrations;
    });
  }

  get currentSuite(): TestSuite | null {
    return this.suites.find((s) => s.provider === this.selectedProvider) || null;
  }

  get filteredIntegrations(): TestIntegration[] {
    return this.integrations.filter((i) => i.provider === this.selectedProvider);
  }

  get selectedIntegration(): TestIntegration | null {
    return this.integrations.find((i) => i.id === this.selectedIntegrationId) || null;
  }

  onProviderChange() {
    this.selectedIntegrationId = '';
    this.testResults = {};
    this.testParams = {};
    this.runningTests = {};

    const filtered = this.filteredIntegrations;
    if (filtered.length === 1) {
      this.selectedIntegrationId = filtered[0].id;
    }
  }

  onIntegrationChange() {
    this.testResults = {};
    this.runningTests = {};
  }

  getParamValue(testKey: string, paramKey: string): any {
    return this.testParams[testKey]?.[paramKey] || '';
  }

  setParamValue(testKey: string, paramKey: string, value: any) {
    if (!this.testParams[testKey]) this.testParams[testKey] = {};
    this.testParams[testKey][paramKey] = value;
  }

  canRun(test: TestDefinition): boolean {
    if (!this.selectedIntegrationId) return false;
    if (this.runningTests[test.key]) return false;
    if (!test.inputs) return true;
    return test.inputs
      .filter((i) => i.required)
      .every((i) => {
        const v = this.testParams[test.key]?.[i.key];
        return v !== undefined && v !== null && String(v).trim() !== '';
      });
  }

  runTest(test: TestDefinition) {
    if (!this.canRun(test)) return;
    this.runningTests[test.key] = true;
    delete this.testResults[test.key];

    this.testingService
      .runTest(this.selectedIntegrationId, test.key, this.testParams[test.key])
      .subscribe({
        next: (result) => {
          this.testResults[test.key] = { result, timestamp: new Date() };
          this.runningTests[test.key] = false;
        },
        error: (err) => {
          this.testResults[test.key] = {
            result: {
              test: test.key,
              success: false,
              message: err.error?.message || 'Error de conexión',
              duration: 0,
            },
            timestamp: new Date(),
          };
          this.runningTests[test.key] = false;
        },
      });
  }

  runAll() {
    if (!this.currentSuite || !this.selectedIntegrationId) return;
    for (const test of this.currentSuite.tests) {
      if (!test.inputs?.some((i) => i.required) || this.canRun(test)) {
        this.runTest(test);
      }
    }
  }

  get passedCount(): number {
    return Object.values(this.testResults).filter((r) => r.result.success).length;
  }

  get totalTests(): number {
    return this.currentSuite?.tests.length || 0;
  }

  formatDetails(details: any): string {
    return JSON.stringify(details, null, 2);
  }

  maskConfig(value: any, key: string): string {
    if (!value) return '—';
    const str = String(value);
    if (['Token', 'Secret', 'Password', 'token', 'secret'].some((k) => key.includes(k))) {
      return str.length > 8 ? str.slice(0, 4) + '••••' + str.slice(-4) : '••••••••';
    }
    return str;
  }
}
