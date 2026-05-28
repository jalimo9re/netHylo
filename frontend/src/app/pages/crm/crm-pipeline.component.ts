import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CrmService } from '../../core/services/crm.service';

@Component({
  selector: 'app-crm-pipeline',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule],
  template: `
    <div class="p-3 sm:p-6">
      <h2 class="text-xl font-semibold mb-4">CRM Pipeline</h2>

      <div class="flex flex-col sm:flex-row gap-2 mb-4">
        <input class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="pipelineName" placeholder="Nombre pipeline" />
        <input
          class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto"
          [(ngModel)]="pipelineStagesText"
          placeholder="Etapas separadas por coma"
        />
        <button mat-flat-button class="w-full sm:w-auto" (click)="createPipeline()">Crear pipeline</button>
      </div>

      <div class="flex flex-col sm:flex-row gap-2 mb-4">
        <input class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="dealTitle" placeholder="Título deal" />
        <input class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="dealAmount" placeholder="Monto" type="number" />
        <button mat-flat-button class="w-full sm:w-auto" (click)="createDeal()" [disabled]="!selectedPipelineId">Crear deal</button>
      </div>

      <div class="flex flex-wrap gap-2 mb-4">
        <input class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="taskTitle" placeholder="Follow-up rápido" />
        <input class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="taskDueAt" type="datetime-local" />
        <select class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="taskDealId">
          <option [ngValue]="null">Sin deal</option>
          <option *ngFor="let deal of deals" [ngValue]="deal.id">{{ deal.title }}</option>
        </select>
        <button mat-flat-button color="primary" class="w-full sm:w-auto" (click)="createTask()">Crear task</button>
      </div>

      <mat-card class="p-4 mb-4" *ngIf="metrics">
        <h3 class="font-semibold mb-2">Métricas mínimas</h3>
        <div class="text-sm opacity-80 mb-2">
          Total deals: {{ metrics.totalDeals }} | Aging promedio: {{ metrics.avgAgeDays }} días
        </div>
        <div class="text-sm mb-1" *ngFor="let stage of selectedPipelineStages">
          <strong>{{ stage }}:</strong> {{ metrics.countsByStage?.[stage] || 0 }} deals
          <span class="opacity-80"> | Conversión siguiente: {{ conversionFor(stage) }}%</span>
        </div>
      </mat-card>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <mat-card class="p-4">
          <h3 class="font-semibold mb-2">Pipelines</h3>
          <div *ngFor="let pipeline of pipelines" class="py-2 border-b border-white/10">
            <button class="underline mr-2" (click)="selectPipeline(pipeline.id)">{{ pipeline.name }}</button>
            <span class="text-xs opacity-70">{{ pipeline.isDefault ? '(default)' : '' }}</span>
            <button mat-stroked-button class="ml-2" (click)="setDefault(pipeline.id)" [disabled]="pipeline.isDefault">
              Hacer default
            </button>
          </div>
        </mat-card>

        <mat-card class="p-4">
          <h3 class="font-semibold mb-2">Deals</h3>
          <div *ngFor="let deal of deals" class="py-2 border-b border-white/10 flex items-center justify-between gap-2">
            <span>{{ deal.title }} - {{ deal.stage }} ({{ deal.amount || 0 }})</span>
            <div class="flex gap-2 items-center">
              <select
                class="border rounded px-2 py-1 bg-transparent"
                [ngModel]="deal.stage"
                (ngModelChange)="moveToStage(deal.id, $event)"
              >
                <option *ngFor="let stage of selectedPipelineStages" [value]="stage">{{ stage }}</option>
              </select>
              <button mat-stroked-button (click)="advance(deal)">Avanzar</button>
              <button mat-stroked-button color="warn" (click)="removeDeal(deal.id)">Borrar</button>
            </div>
          </div>
        </mat-card>

        <mat-card class="p-4">
          <h3 class="font-semibold mb-2">Tasks rápidas</h3>
          <div *ngFor="let task of tasks" class="py-2 border-b border-white/10 flex items-center justify-between gap-2">
            <div>
              <div>{{ task.title }}</div>
              <div class="text-xs opacity-70">
                Deal: {{ dealLabel(task.dealId) }} |
                Vence: {{ task.dueAt ? (task.dueAt | date: 'short') : 'Sin fecha' }}
              </div>
            </div>
            <div class="flex items-center gap-2">
              <span class="text-xs" [class.text-amber-300]="isOverdue(task)"> {{ isOverdue(task) ? 'Vencida' : 'Activa' }} </span>
              <button mat-stroked-button (click)="completeTask(task.id)">Completar</button>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
})
export class CrmPipelineComponent implements OnInit {
  pipelines: any[] = [];
  deals: any[] = [];
  metrics: any = null;
  pipelineName = '';
  pipelineStagesText = 'New Lead,Qualified,Proposal,Won,Lost';
  dealTitle = '';
  dealAmount: number | null = null;
  selectedPipelineId: string | null = null;
  selectedPipelineStages: string[] = [];
  tasks: any[] = [];
  taskTitle = '';
  taskDueAt = '';
  taskDealId: string | null = null;

  constructor(private crmService: CrmService) {}

  ngOnInit(): void {
    this.loadPipelines();
  }

  loadPipelines() {
    this.crmService.listPipelines().subscribe((data) => {
      this.pipelines = data;
      if (!this.selectedPipelineId && data.length) {
        this.selectedPipelineId = data[0].id;
      }
      this.syncSelectedPipelineState();
      if (this.selectedPipelineId) {
        this.loadDeals();
        this.loadMetrics();
      }
    });
  }

  loadDeals() {
    this.crmService.listDeals(this.selectedPipelineId || undefined).subscribe((data) => {
      this.deals = data;
      this.loadTasks();
    });
  }

  createPipeline() {
    if (!this.pipelineName.trim()) return;
    const stages = this.pipelineStagesText
      .split(',')
      .map((stage) => stage.trim())
      .filter(Boolean);
    this.crmService
      .createPipeline({
        name: this.pipelineName,
        stages: stages.length ? stages : undefined,
        isDefault: this.pipelines.length === 0,
      })
      .subscribe((pipeline) => {
        this.pipelineName = '';
        this.selectedPipelineId = pipeline.id;
        this.loadPipelines();
        this.loadDeals();
        this.loadMetrics();
      });
  }

  createDeal() {
    if (!this.selectedPipelineId || !this.dealTitle.trim()) return;
    this.crmService
      .createDeal({
        pipelineId: this.selectedPipelineId,
        title: this.dealTitle,
        amount: Number(this.dealAmount || 0),
      })
      .subscribe(() => {
        this.dealTitle = '';
        this.dealAmount = null;
        this.loadDeals();
        this.loadMetrics();
      });
  }

  createTask() {
    if (!this.taskTitle.trim()) return;
    this.crmService
      .createTask({
        title: this.taskTitle.trim(),
        dueAt: this.taskDueAt ? new Date(this.taskDueAt).toISOString() : null,
        dealId: this.taskDealId || null,
      })
      .subscribe(() => {
        this.taskTitle = '';
        this.taskDueAt = '';
        this.taskDealId = null;
        this.loadTasks();
      });
  }

  selectPipeline(pipelineId: string) {
    this.selectedPipelineId = pipelineId;
    this.syncSelectedPipelineState();
    this.loadDeals();
    this.loadMetrics();
    this.loadTasks();
  }

  advance(deal: any) {
    const stages = this.selectedPipelineStages;
    const current = stages.indexOf(deal.stage);
    const next = stages[Math.min(current + 1, stages.length - 1)] || deal.stage;
    this.crmService.moveDealStage(deal.id, next).subscribe(() => this.loadDeals());
  }

  moveToStage(dealId: string, stage: string) {
    this.crmService.moveDealStage(dealId, stage).subscribe(() => {
      this.loadDeals();
      this.loadMetrics();
    });
  }

  removeDeal(dealId: string) {
    this.crmService.deleteDeal(dealId).subscribe(() => {
      this.loadDeals();
      this.loadMetrics();
      this.loadTasks();
    });
  }

  setDefault(pipelineId: string) {
    this.crmService.setDefaultPipeline(pipelineId).subscribe(() => this.loadPipelines());
  }

  loadMetrics() {
    if (!this.selectedPipelineId) return;
    this.crmService.getPipelineMetrics(this.selectedPipelineId).subscribe((data) => {
      this.metrics = data;
    });
  }

  conversionFor(stage: string) {
    const row = this.metrics?.conversionByStage?.find((item: any) => item.stage === stage);
    return row?.conversionRate ?? 0;
  }

  loadTasks() {
    this.crmService.listTasks().subscribe((data) => {
      const dealIds = new Set(this.deals.map((deal) => deal.id));
      this.tasks = data.filter((task) => !task.dealId || dealIds.has(task.dealId)).slice(0, 20);
    });
  }

  completeTask(taskId: string) {
    this.crmService.completeTask(taskId).subscribe(() => this.loadTasks());
  }

  isOverdue(task: any) {
    return !!task?.dueAt && new Date(task.dueAt).getTime() < Date.now();
  }

  dealLabel(dealId: string | null) {
    if (!dealId) return 'General';
    const deal = this.deals.find((candidate) => candidate.id === dealId);
    return deal?.title || 'Deal';
  }

  private syncSelectedPipelineState() {
    const selected = this.pipelines.find((pipeline) => pipeline.id === this.selectedPipelineId);
    this.selectedPipelineStages = selected?.stages || [];
  }
}
