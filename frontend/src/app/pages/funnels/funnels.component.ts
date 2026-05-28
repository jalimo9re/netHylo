import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { FunnelsService } from '../../core/services/funnels.service';
import {
  BLOCK_TYPES,
  BuilderHistoryState,
  BuilderBlock,
  BlockType,
  createBlock,
  duplicateBlockAt,
  getEditablePropKeys,
  initHistory,
  moveBlock,
  parseBlocks,
  pushHistory,
  redoHistory,
  removeBlockAt,
  serializeBlocks,
  undoHistory,
  updateBlockProps,
} from '../sites-funnels/block-builder.utils';
import { environment } from '../../../environments/environment';

@Component({
  selector: 'app-funnels',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold mb-4">Funnels</h2>

      <div class="flex flex-wrap gap-2 mb-4">
        <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="funnelName" placeholder="Nombre" />
        <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="funnelSlug" placeholder="Slug público" />
        <button mat-flat-button (click)="createFunnel()">Crear funnel</button>
      </div>

      <div class="grid gap-3">
        <mat-card class="p-4" *ngFor="let funnel of funnels">
          <div class="font-medium">{{ funnel.name }}</div>
          <div class="text-sm opacity-70 mb-2">
            /{{ funnel.slug }} · v{{ funnel.version }} · {{ funnel.isPublished ? 'Publicado' : 'Borrador' }}
            · {{ funnel.steps?.length || 0 }} pasos
          </div>
          <div class="flex flex-wrap gap-2 mb-3">
            <button mat-stroked-button (click)="togglePublish(funnel)">
              {{ funnel.isPublished ? 'Despublicar' : 'Publicar' }}
            </button>
            <button mat-stroked-button (click)="editFunnel(funnel)">Editar steps</button>
            <button mat-stroked-button (click)="previewFunnel(funnel.slug)">Preview público</button>
            <button mat-stroked-button (click)="loadMetrics(funnel)">Métricas</button>
            <button mat-stroked-button (click)="removeFunnel(funnel)">Eliminar</button>
          </div>

          <div *ngIf="editingFunnelId === funnel.id">
            <div class="flex flex-wrap gap-2 mb-3">
              <button mat-stroked-button (click)="undoStepChanges()">Undo</button>
              <button mat-stroked-button (click)="redoStepChanges()">Redo</button>
            </div>
            <div class="space-y-3">
              <div class="border rounded p-3" *ngFor="let step of stepDrafts; let stepIndex = index">
                <div class="flex gap-2 mb-2">
                  <input
                    class="border rounded px-2 py-1 bg-transparent"
                    [(ngModel)]="step.name"
                    placeholder="Nombre del step"
                  />
                  <input
                    class="border rounded px-2 py-1 bg-transparent w-28"
                    type="number"
                    [(ngModel)]="step.stepOrder"
                    placeholder="Orden"
                  />
                </div>
                <div class="flex flex-wrap gap-2 mb-2">
                  <button
                    mat-stroked-button
                    *ngFor="let blockType of blockTypes"
                    draggable="true"
                    (dragstart)="startPaletteDrag($event, stepIndex, blockType)"
                  >
                    + {{ blockType }}
                  </button>
                  <button mat-stroked-button (click)="toggleStepPreview(stepIndex)">
                    {{ showPreviewByStep[stepIndex] ? 'Ocultar preview' : 'Preview inline' }}
                  </button>
                </div>
                <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_280px]">
                  <div
                    class="border rounded p-3 min-h-[90px]"
                    (dragover)="allowDrop($event)"
                    (drop)="dropOnStep($event, stepIndex)"
                  >
                  <div
                    class="border rounded p-2 bg-black/10 mb-2"
                    [class.ring-2]="selectedBlockByStep[stepIndex] === blockIndex"
                    *ngFor="let block of step.blocks; let blockIndex = index"
                    draggable="true"
                    (dragstart)="startExistingDrag($event, stepIndex, blockIndex)"
                    (click)="selectStepBlock(stepIndex, blockIndex)"
                  >
                    <div class="text-xs uppercase opacity-70 mb-1">{{ block.type }}</div>
                    <div class="text-sm mb-2">{{ blockPrimaryValue(block) }}</div>
                    <div class="flex flex-wrap gap-1">
                      <button mat-stroked-button (click)="moveStepBlock(stepIndex, blockIndex, -1)">↑</button>
                      <button mat-stroked-button (click)="moveStepBlock(stepIndex, blockIndex, 1)">↓</button>
                      <button mat-stroked-button (click)="duplicateStepBlock(stepIndex, blockIndex)">Duplicar</button>
                      <button mat-stroked-button (click)="removeStepBlock(stepIndex, blockIndex)">Quitar</button>
                    </div>
                  </div>
                  </div>
                  <div class="border rounded p-3" *ngIf="getSelectedStepBlock(stepIndex) as selected">
                    <div class="text-xs uppercase opacity-70 mb-2">Propiedades {{ selected.type }}</div>
                    <div class="space-y-2">
                      <div *ngFor="let key of editableKeys(selected.type)">
                        <label class="text-xs opacity-70">{{ key }}</label>
                        <input
                          class="border rounded px-2 py-1 bg-transparent w-full"
                          [ngModel]="selected.props[key] || ''"
                          (ngModelChange)="updateStepBlockProp(stepIndex, selectedBlockByStep[stepIndex] || 0, key, $event)"
                        />
                      </div>
                    </div>
                  </div>
                </div>
                <div *ngIf="showPreviewByStep[stepIndex]" class="border rounded p-3 mt-2">
                  <div *ngFor="let block of step.blocks" class="mb-2">
                    <h3 *ngIf="block.type === 'hero'" class="font-semibold">{{ block.props['title'] }}</h3>
                    <p *ngIf="block.type === 'text'" class="whitespace-pre-wrap">{{ block.props['content'] }}</p>
                    <img
                      *ngIf="block.type === 'image' && block.props['url']"
                      [src]="block.props['url']"
                      [alt]="block.props['alt'] || 'image'"
                      class="max-h-36 rounded"
                    />
                    <button *ngIf="block.type === 'button'" class="border rounded px-2 py-1">{{ block.props['text'] }}</button>
                    <div *ngIf="block.type === 'form'" class="border rounded p-2">{{ block.props['title'] }}</div>
                  </div>
                </div>
              </div>
            </div>
            <textarea
              class="border rounded px-3 py-2 bg-transparent w-full min-h-[180px] mt-3"
              [ngModel]="stepsJson"
              (ngModelChange)="onStepsJsonChange($event)"
              placeholder='JSON steps: [{"name":"Landing","stepOrder":0,"config":{"blocks":[]}}]'
            ></textarea>
            <div class="flex gap-2 mt-2">
              <button mat-flat-button (click)="saveSteps(funnel.id)">Guardar steps</button>
              <button mat-stroked-button (click)="cancelEdit()">Cancelar</button>
            </div>
          </div>
        </mat-card>
      </div>

      <mat-card class="p-4 mt-4" *ngIf="metrics">
        <h3 class="font-semibold mb-2">Métricas del funnel</h3>
        <pre class="text-xs opacity-80 overflow-auto">{{ metrics | json }}</pre>
      </mat-card>
    </div>
  `,
})
export class FunnelsComponent implements OnInit {
  blockTypes = BLOCK_TYPES;
  funnels: any[] = [];
  editingFunnelId: string | null = null;
  stepsJson = '';
  stepDrafts: Array<{ name: string; stepOrder: number; config: Record<string, unknown>; blocks: BuilderBlock[] }> = [];
  stepHistory: BuilderHistoryState<
    Array<{ name: string; stepOrder: number; config: Record<string, unknown>; blocks: BuilderBlock[] }>
  > = initHistory([]);
  metrics: any = null;
  selectedBlockByStep: Record<number, number | null> = {};
  showPreviewByStep: Record<number, boolean> = {};

  funnelName = '';
  funnelSlug = '';

  constructor(private funnelsService: FunnelsService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.funnelsService.list().subscribe((data) => (this.funnels = data));
  }

  createFunnel() {
    if (!this.funnelName.trim()) return;
    let steps: unknown[] = [];
    try {
      steps = JSON.parse(
        this.stepsJson ||
          JSON.stringify(
            [
              { name: 'Landing', stepOrder: 0, config: { goal: 'capture' } },
              { name: 'Checkout', stepOrder: 1, config: { goal: 'conversion' } },
            ],
            null,
            2,
          ),
      );
    } catch {
      steps = [
        { name: 'Landing', stepOrder: 0, config: {} },
        { name: 'Checkout', stepOrder: 1, config: {} },
      ];
    }
    this.funnelsService
      .create({
        name: this.funnelName,
        slug: this.funnelSlug || undefined,
        steps: this.normalizeStepsFromJson(steps),
      })
      .subscribe(() => {
        this.funnelName = '';
        this.funnelSlug = '';
        this.load();
      });
  }

  togglePublish(funnel: any) {
    this.funnelsService.publish(funnel.id, !funnel.isPublished).subscribe(() => this.load());
  }

  removeFunnel(funnel: any) {
    this.funnelsService.remove(funnel.id).subscribe(() => this.load());
  }

  editFunnel(funnel: any) {
    this.editingFunnelId = funnel.id;
    this.funnelsService.get(funnel.id).subscribe((full) => {
      this.stepDrafts = (full.steps || []).map((step: any, index: number) => {
        const config =
          step.config && typeof step.config === 'object' && !Array.isArray(step.config) ? step.config : {};
        const blocks = parseBlocks((config as Record<string, unknown>)['blocks'] as unknown[]);
        return {
          name: step.name || `Step ${index + 1}`,
          stepOrder: step.stepOrder ?? index,
          config,
          blocks,
        };
      });
      this.stepHistory = initHistory(this.cloneStepDrafts(this.stepDrafts));
      this.selectedBlockByStep = {};
      this.showPreviewByStep = {};
      this.stepDrafts.forEach((step, index) => {
        this.selectedBlockByStep[index] = step.blocks.length ? 0 : null;
        this.showPreviewByStep[index] = false;
      });
      this.syncStepsJson();
    });
  }

  cancelEdit() {
    this.editingFunnelId = null;
    this.stepsJson = '';
    this.stepDrafts = [];
    this.stepHistory = initHistory([]);
    this.selectedBlockByStep = {};
    this.showPreviewByStep = {};
  }

  saveSteps(funnelId: string) {
    const steps = this.stepDrafts.map((step) => ({
      name: step.name,
      stepOrder: Number(step.stepOrder) || 0,
      config: { ...step.config, blocks: serializeBlocks(step.blocks) },
      blocks: serializeBlocks(step.blocks),
    }));
    this.funnelsService.update(funnelId, { steps }).subscribe(() => {
      this.cancelEdit();
      this.load();
    });
  }

  loadMetrics(funnel: any) {
    this.funnelsService.metrics(funnel.id).subscribe((data) => (this.metrics = data));
  }

  previewFunnel(slug: string) {
    window.open(`${environment.apiUrl}/public/funnels/${slug}`, '_blank');
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  startPaletteDrag(event: DragEvent, stepIndex: number, type: BlockType) {
    event.dataTransfer?.setData('application/x-builder', JSON.stringify({ mode: 'new', stepIndex, type }));
  }

  startExistingDrag(event: DragEvent, stepIndex: number, blockIndex: number) {
    event.dataTransfer?.setData(
      'application/x-builder',
      JSON.stringify({ mode: 'move', stepIndex, blockIndex }),
    );
  }

  dropOnStep(event: DragEvent, stepIndex: number) {
    event.preventDefault();
    const rawData = event.dataTransfer?.getData('application/x-builder');
    if (!rawData) return;
    const payload = JSON.parse(rawData) as {
      mode: string;
      type?: BlockType;
      stepIndex?: number;
      blockIndex?: number;
    };
    const step = this.stepDrafts[stepIndex];
    if (!step) return;
    const blocks = [...step.blocks];
    if (payload.mode === 'new' && payload.type) {
      blocks.push(createBlock(payload.type));
    } else if (
      payload.mode === 'move' &&
      payload.stepIndex === stepIndex &&
      typeof payload.blockIndex === 'number'
    ) {
      this.commitStepBlocks(stepIndex, moveBlock(blocks, payload.blockIndex, blocks.length - 1));
      return;
    }
    this.commitStepBlocks(stepIndex, blocks);
  }

  updateStepBlock(stepIndex: number, blockIndex: number, value: string) {
    const step = this.stepDrafts[stepIndex];
    const block = step?.blocks[blockIndex];
    if (!step || !block) return;
    const key = this.primaryPropKey(block.type);
    this.commitStepBlocks(stepIndex, updateBlockProps(step.blocks, blockIndex, { [key]: value }));
  }

  updateStepBlockProp(stepIndex: number, blockIndex: number, key: string, value: string) {
    const step = this.stepDrafts[stepIndex];
    if (!step) return;
    this.commitStepBlocks(stepIndex, updateBlockProps(step.blocks, blockIndex, { [key]: value }));
  }

  removeStepBlock(stepIndex: number, blockIndex: number) {
    const step = this.stepDrafts[stepIndex];
    if (!step) return;
    this.commitStepBlocks(stepIndex, removeBlockAt(step.blocks, blockIndex));
  }

  duplicateStepBlock(stepIndex: number, blockIndex: number) {
    const step = this.stepDrafts[stepIndex];
    if (!step) return;
    this.commitStepBlocks(stepIndex, duplicateBlockAt(step.blocks, blockIndex));
  }

  moveStepBlock(stepIndex: number, blockIndex: number, direction: -1 | 1) {
    const step = this.stepDrafts[stepIndex];
    if (!step) return;
    this.commitStepBlocks(stepIndex, moveBlock(step.blocks, blockIndex, blockIndex + direction));
  }

  blockPrimaryValue(block: BuilderBlock): string {
    return block.props[this.primaryPropKey(block.type)] || '';
  }

  onStepsJsonChange(value: string) {
    this.stepsJson = value;
    try {
      const raw = JSON.parse(value || '[]');
      const normalized = this.normalizeStepsFromJson(raw);
      this.stepDrafts = normalized.map((step: any, index: number) => ({
        name: step.name || `Step ${index + 1}`,
        stepOrder: step.stepOrder ?? index,
        config:
          step.config && typeof step.config === 'object' && !Array.isArray(step.config) ? step.config : {},
        blocks: parseBlocks(step.blocks || step.config?.blocks || []),
      }));
      this.stepHistory = pushHistory(this.stepHistory, this.cloneStepDrafts(this.stepDrafts));
    } catch {
      // keep invalid JSON until user fixes it.
    }
  }

  editableKeys(type: BlockType): string[] {
    return getEditablePropKeys(type);
  }

  selectStepBlock(stepIndex: number, blockIndex: number) {
    this.selectedBlockByStep[stepIndex] = blockIndex;
  }

  getSelectedStepBlock(stepIndex: number): BuilderBlock | null {
    const selected = this.selectedBlockByStep[stepIndex];
    if (selected === null || selected === undefined) return null;
    return this.stepDrafts[stepIndex]?.blocks[selected] || null;
  }

  toggleStepPreview(stepIndex: number) {
    this.showPreviewByStep[stepIndex] = !this.showPreviewByStep[stepIndex];
  }

  undoStepChanges() {
    this.stepHistory = undoHistory(this.stepHistory);
    this.stepDrafts = this.cloneStepDrafts(this.stepHistory.present);
    this.syncStepsJson();
  }

  redoStepChanges() {
    this.stepHistory = redoHistory(this.stepHistory);
    this.stepDrafts = this.cloneStepDrafts(this.stepHistory.present);
    this.syncStepsJson();
  }

  private syncStepsJson() {
    this.stepsJson = JSON.stringify(
      this.stepDrafts.map((step) => ({
        name: step.name,
        stepOrder: Number(step.stepOrder) || 0,
        config: { ...step.config, blocks: serializeBlocks(step.blocks) },
      })),
      null,
      2,
    );
  }

  private commitStepBlocks(stepIndex: number, blocks: BuilderBlock[]) {
    const step = this.stepDrafts[stepIndex];
    if (!step) return;
    const nextDrafts = this.stepDrafts.map((draft, index) => (index === stepIndex ? { ...step, blocks } : draft));
    this.stepDrafts = nextDrafts;
    this.stepHistory = pushHistory(this.stepHistory, this.cloneStepDrafts(nextDrafts));
    this.syncStepsJson();
    const selected = this.selectedBlockByStep[stepIndex];
    if (typeof selected === 'number' && selected >= blocks.length) {
      this.selectedBlockByStep[stepIndex] = blocks.length ? blocks.length - 1 : null;
    }
  }

  private cloneStepDrafts(
    drafts: Array<{ name: string; stepOrder: number; config: Record<string, unknown>; blocks: BuilderBlock[] }>,
  ) {
    return drafts.map((step) => ({
      ...step,
      config: { ...step.config },
      blocks: step.blocks.map((block) => ({ ...block, props: { ...block.props } })),
    }));
  }

  private primaryPropKey(type: BlockType): string {
    if (type === 'hero') return 'title';
    if (type === 'text') return 'content';
    if (type === 'image') return 'url';
    if (type === 'form') return 'title';
    return 'text';
  }

  private normalizeStepsFromJson(raw: unknown): unknown[] {
    if (!Array.isArray(raw)) return [];
    return raw;
  }
}
