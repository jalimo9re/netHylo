import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CrmService } from '../../core/services/crm.service';

@Component({
  selector: 'app-automations',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule],
  template: `
    <div class="p-3 sm:p-6">
      <h2 class="text-xl font-semibold mb-4">Automatizaciones</h2>
      <div class="flex flex-col sm:flex-row gap-2 mb-4">
        <input class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="workflowName" placeholder="Nombre workflow" />
        <select class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="trigger">
          <option value="lead.created">lead.created</option>
          <option value="deal.created">deal.created</option>
          <option value="form.submitted">form.submitted</option>
          <option value="review.received">review.received</option>
          <option value="membership.enrolled">membership.enrolled</option>
          <option value="deal.stage_changed">deal.stage_changed</option>
          <option value="calendar.event_created">calendar.event_created</option>
          <option value="calendar.booking_created">calendar.booking_created</option>
          <option value="affiliate.conversion">affiliate.conversion</option>
        </select>
        <input class="border rounded px-3 py-2 bg-transparent w-full sm:w-36" [(ngModel)]="delayMs" type="number" min="0" placeholder="Delay ms" />
        <button mat-flat-button class="w-full sm:w-auto" (click)="createWorkflow()">Crear workflow</button>
      </div>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <mat-card class="p-4">
          <h3 class="font-semibold mb-2">Workflows</h3>
          <div *ngFor="let wf of workflows" class="py-2 border-b border-white/10">
            {{ wf.name }} - {{ wf.trigger }}
          </div>
        </mat-card>
        <mat-card class="p-4">
          <h3 class="font-semibold mb-2">Ejecuciones</h3>
          <div *ngFor="let run of runs" class="py-2 border-b border-white/10">
            <div>{{ run.workflowId }} - {{ run.status }}</div>
            <div class="text-xs opacity-70">Trigger: {{ run.result?.trigger || '-' }}</div>
            <div class="text-xs opacity-70">Steps: {{ run.result?.stepStates?.length || 0 }} | Entregas: {{ run.result?.delivery?.length || 0 }}</div>
            <div class="text-xs text-red-300" *ngIf="run.error">{{ run.error }}</div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
})
export class AutomationsComponent implements OnInit {
  workflows: any[] = [];
  runs: any[] = [];
  workflowName = '';
  trigger = 'form.submitted';
  delayMs = 0;

  constructor(private crmService: CrmService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.crmService.listWorkflows().subscribe((data) => (this.workflows = data));
    this.crmService.listWorkflowRuns().subscribe((data) => (this.runs = data));
  }

  createWorkflow() {
    if (!this.workflowName.trim()) return;
    this.crmService
      .createWorkflow({
        name: this.workflowName,
        trigger: this.trigger,
        steps: [
          ...(this.delayMs > 0 ? [{ type: 'delay', ms: Number(this.delayMs) }] : []),
          { type: 'email' },
          { type: 'sms' },
        ],
      })
      .subscribe(() => {
        this.workflowName = '';
        this.delayMs = 0;
        this.load();
      });
  }
}
