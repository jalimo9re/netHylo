import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { SitesService } from '../../core/services/sites.service';
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
  selector: 'app-sites',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold mb-4">Websites</h2>

      <div class="flex flex-wrap gap-2 mb-4">
        <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="siteName" placeholder="Nombre" />
        <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="siteSlug" placeholder="Slug público" />
        <button mat-flat-button (click)="createSite()">Crear sitio</button>
      </div>

      <div class="grid gap-3">
        <mat-card class="p-4" *ngFor="let site of sites">
          <div class="font-medium">{{ site.name }}</div>
          <div class="text-sm opacity-70 mb-2">
            /{{ site.slug }} · v{{ site.version }} · {{ site.isPublished ? 'Publicado' : 'Borrador' }}
          </div>
          <div class="flex flex-wrap gap-2 mb-3">
            <button mat-stroked-button (click)="togglePublish(site)">
              {{ site.isPublished ? 'Despublicar' : 'Publicar' }}
            </button>
            <button mat-stroked-button (click)="selectSite(site)">Editar páginas</button>
            <button mat-stroked-button (click)="previewSite(site.slug)">Preview público</button>
            <button mat-stroked-button (click)="removeSite(site)">Eliminar</button>
          </div>

          <div *ngIf="selectedSiteId === site.id" class="border-t border-white/10 pt-3">
            <div class="flex flex-wrap gap-2 mb-3">
              <button mat-stroked-button (click)="undoPageChanges()">Undo</button>
              <button mat-stroked-button (click)="redoPageChanges()">Redo</button>
            </div>
            <div class="flex flex-wrap gap-2 mb-3">
              <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="pageName" placeholder="Nombre página" />
              <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="pageSlug" placeholder="Slug página" />
              <button mat-flat-button (click)="createPage(site.id)">Añadir página</button>
            </div>
            <div class="mb-3" *ngFor="let page of pages">
              <div class="text-sm font-medium">{{ page.name }} (/{{ page.slug }})</div>
              <div class="flex flex-wrap gap-2 mt-2 mb-2 text-xs sm:text-sm">
                <button
                  mat-stroked-button
                  *ngFor="let blockType of blockTypes"
                  draggable="true"
                  (dragstart)="startPaletteDrag($event, blockType)"
                >
                  + {{ blockType }}
                </button>
                <button mat-stroked-button (click)="toggleRawEditor(page.id)">
                  {{ showRawEditor[page.id] ? 'Ocultar JSON' : 'Mostrar JSON' }}
                </button>
                <button mat-stroked-button (click)="togglePreview(page.id)">
                  {{ showPreviewByPage[page.id] ? 'Ocultar preview' : 'Preview inline' }}
                </button>
                <button mat-stroked-button (click)="previewPage(site.slug, page.slug)">Preview página</button>
              </div>

              <div class="grid gap-3 lg:grid-cols-[minmax(0,1fr)_300px]">
                <div
                  class="border rounded p-3 min-h-[120px] space-y-2"
                  (dragover)="allowDrop($event)"
                  (drop)="dropOnPage($event, page.id)"
                >
                  <div
                    class="border rounded p-3 bg-black/10 cursor-move"
                    [class.ring-2]="selectedBlockByPage[page.id] === idx"
                    *ngFor="let block of pageDraftBlocks[page.id]; let idx = index"
                    draggable="true"
                    (dragstart)="startExistingDrag($event, page.id, idx)"
                    (dragover)="allowDrop($event)"
                    (drop)="dropOnBlock($event, page.id, idx)"
                    (click)="selectBlock(page.id, idx)"
                  >
                    <div class="text-xs uppercase opacity-70 mb-2">{{ block.type }}</div>
                    <div class="text-sm mb-2">{{ blockSummary(block) }}</div>
                    <div class="flex flex-wrap gap-1">
                      <button mat-stroked-button (click)="moveBlockUp(page.id, idx)">↑</button>
                      <button mat-stroked-button (click)="moveBlockDown(page.id, idx)">↓</button>
                      <button mat-stroked-button (click)="duplicateBlock(page.id, idx)">Duplicar</button>
                      <button mat-stroked-button (click)="removeBlock(page.id, idx)">Quitar</button>
                    </div>
                  </div>
                  <div *ngIf="!pageDraftBlocks[page.id]?.length" class="text-xs opacity-60">
                    Arrastra bloques aquí
                  </div>
                </div>
                <div class="border rounded p-3" *ngIf="getSelectedBlock(page.id) as selected">
                  <div class="text-xs uppercase opacity-70 mb-2">Propiedades {{ selected.type }}</div>
                  <div class="space-y-2">
                    <div *ngFor="let key of editableKeys(selected.type)">
                      <label class="text-xs opacity-70">{{ key }}</label>
                      <input
                        class="border rounded px-2 py-1 w-full bg-transparent"
                        [ngModel]="selected.props[key] || ''"
                        (ngModelChange)="updateProp(page.id, selectedBlockByPage[page.id] || 0, key, $event)"
                      />
                    </div>
                  </div>
                </div>
              </div>

              <div *ngIf="showPreviewByPage[page.id]" class="border rounded p-3 mt-2">
                <div *ngFor="let block of pageDraftBlocks[page.id]" class="mb-3">
                  <h3 *ngIf="block.type === 'hero'" class="text-lg font-semibold">{{ block.props['title'] }}</h3>
                  <p *ngIf="block.type === 'hero'" class="opacity-70">{{ block.props['subtitle'] }}</p>
                  <p *ngIf="block.type === 'text'" class="whitespace-pre-wrap">{{ block.props['content'] }}</p>
                  <img
                    *ngIf="block.type === 'image' && block.props['url']"
                    [src]="block.props['url']"
                    [alt]="block.props['alt'] || 'image'"
                    class="max-h-48 rounded"
                  />
                  <div *ngIf="block.type === 'form'" class="border rounded p-2">{{ block.props['title'] }}</div>
                  <button *ngIf="block.type === 'button'" class="border rounded px-2 py-1">{{ block.props['text'] }}</button>
                </div>
              </div>

              <textarea
                *ngIf="showRawEditor[page.id]"
                class="border rounded px-3 py-2 bg-transparent w-full min-h-[100px] mt-2"
                [ngModel]="pageBlocks[page.id]"
                (ngModelChange)="onRawJsonChange(page.id, $event)"
                placeholder='JSON blocks: [{"type":"hero","props":{"title":"Hola"}}]'
              ></textarea>
              <div class="flex gap-2 mt-2">
                <button mat-stroked-button (click)="savePage(site.id, page)">Guardar blocks</button>
                <button mat-stroked-button (click)="deletePage(site.id, page.id)">Eliminar</button>
              </div>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
})
export class SitesComponent implements OnInit {
  blockTypes = BLOCK_TYPES;
  sites: any[] = [];
  pages: any[] = [];
  selectedSiteId: string | null = null;
  pageBlocks: Record<string, string> = {};
  pageDraftBlocks: Record<string, BuilderBlock[]> = {};
  pageHistory: BuilderHistoryState<Record<string, BuilderBlock[]>> = initHistory({});
  showRawEditor: Record<string, boolean> = {};
  showPreviewByPage: Record<string, boolean> = {};
  selectedBlockByPage: Record<string, number | null> = {};

  siteName = '';
  siteSlug = '';
  pageName = '';
  pageSlug = '';
  constructor(private sitesService: SitesService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.sitesService.list().subscribe((data) => (this.sites = data));
  }

  createSite() {
    if (!this.siteName.trim()) return;
    this.sitesService
      .create({ name: this.siteName, slug: this.siteSlug || undefined })
      .subscribe(() => {
        this.siteName = '';
        this.siteSlug = '';
        this.load();
      });
  }

  togglePublish(site: any) {
    this.sitesService.publish(site.id, !site.isPublished).subscribe(() => this.load());
  }

  removeSite(site: any) {
    this.sitesService.remove(site.id).subscribe(() => {
      if (this.selectedSiteId === site.id) this.selectedSiteId = null;
      this.load();
    });
  }

  selectSite(site: any) {
    this.selectedSiteId = site.id;
    this.sitesService.listPages(site.id).subscribe((pages) => {
      this.pages = pages;
      this.pageBlocks = {};
      const draftBlocks: Record<string, BuilderBlock[]> = {};
      this.showPreviewByPage = {};
      this.selectedBlockByPage = {};
      for (const page of pages) {
        const parsed = parseBlocks(page.blocks || []);
        draftBlocks[page.id] = parsed;
        this.pageBlocks[page.id] = JSON.stringify(serializeBlocks(parsed), null, 2);
        this.showPreviewByPage[page.id] = false;
        this.selectedBlockByPage[page.id] = parsed.length ? 0 : null;
      }
      this.pageHistory = initHistory(draftBlocks);
      this.pageDraftBlocks = draftBlocks;
    });
  }

  createPage(siteId: string) {
    if (!this.pageName.trim()) return;
    const blocks = [
      {
        type: 'hero',
        props: { ...createBlock('hero').props, title: this.pageName },
      },
    ];
    this.sitesService
      .createPage(siteId, {
        name: this.pageName,
        slug: this.pageSlug || undefined,
        blocks,
      })
      .subscribe(() => {
        this.pageName = '';
        this.pageSlug = '';
        this.selectSite({ id: siteId });
        this.load();
      });
  }

  savePage(siteId: string, page: any) {
    const blocks = serializeBlocks(this.pageDraftBlocks[page.id] || []);
    this.sitesService.updatePage(siteId, page.id, { blocks }).subscribe(() => this.selectSite({ id: siteId }));
  }

  deletePage(siteId: string, pageId: string) {
    this.sitesService.deletePage(siteId, pageId).subscribe(() => this.selectSite({ id: siteId }));
  }

  previewSite(slug: string) {
    window.open(`${environment.apiUrl}/public/sites/${slug}`, '_blank');
  }

  previewPage(siteSlug: string, pageSlug: string) {
    window.open(`${environment.apiUrl}/public/sites/${siteSlug}/pages/${pageSlug}`, '_blank');
  }

  allowDrop(event: DragEvent) {
    event.preventDefault();
  }

  startPaletteDrag(event: DragEvent, type: BlockType) {
    event.dataTransfer?.setData('application/x-builder', JSON.stringify({ mode: 'new', type }));
  }

  startExistingDrag(event: DragEvent, pageId: string, index: number) {
    event.dataTransfer?.setData('application/x-builder', JSON.stringify({ mode: 'move', pageId, index }));
  }

  dropOnPage(event: DragEvent, pageId: string) {
    event.preventDefault();
    const rawData = event.dataTransfer?.getData('application/x-builder');
    if (!rawData) return;
    const parsed = JSON.parse(rawData) as { mode: string; type?: BlockType; pageId?: string; index?: number };

    const blocks = [...(this.pageDraftBlocks[pageId] || [])];
    if (parsed.mode === 'new' && parsed.type) {
      blocks.push(createBlock(parsed.type));
    } else if (parsed.mode === 'move' && parsed.pageId === pageId && typeof parsed.index === 'number') {
      this.commitPageBlocks(pageId, moveBlock(blocks, parsed.index, blocks.length - 1));
      return;
    }
    this.commitPageBlocks(pageId, blocks);
  }

  dropOnBlock(event: DragEvent, pageId: string, targetIndex: number) {
    event.preventDefault();
    event.stopPropagation();
    const rawData = event.dataTransfer?.getData('application/x-builder');
    if (!rawData) return;
    const parsed = JSON.parse(rawData) as { mode: string; type?: BlockType; pageId?: string; index?: number };
    const blocks = [...(this.pageDraftBlocks[pageId] || [])];
    if (parsed.mode === 'new' && parsed.type) {
      blocks.splice(targetIndex, 0, createBlock(parsed.type));
      this.commitPageBlocks(pageId, blocks);
      return;
    }
    if (parsed.mode === 'move' && parsed.pageId === pageId && typeof parsed.index === 'number') {
      this.commitPageBlocks(pageId, moveBlock(blocks, parsed.index, targetIndex));
    }
  }

  updateProp(pageId: string, index: number, key: string, value: string) {
    const blocks = this.pageDraftBlocks[pageId] || [];
    this.commitPageBlocks(pageId, updateBlockProps(blocks, index, { [key]: value }));
  }

  removeBlock(pageId: string, index: number) {
    const blocks = this.pageDraftBlocks[pageId] || [];
    this.commitPageBlocks(pageId, removeBlockAt(blocks, index));
  }

  duplicateBlock(pageId: string, index: number) {
    const blocks = this.pageDraftBlocks[pageId] || [];
    this.commitPageBlocks(pageId, duplicateBlockAt(blocks, index));
  }

  moveBlockUp(pageId: string, index: number) {
    const blocks = this.pageDraftBlocks[pageId] || [];
    this.commitPageBlocks(pageId, moveBlock(blocks, index, index - 1));
  }

  moveBlockDown(pageId: string, index: number) {
    const blocks = this.pageDraftBlocks[pageId] || [];
    this.commitPageBlocks(pageId, moveBlock(blocks, index, index + 1));
  }

  toggleRawEditor(pageId: string) {
    this.showRawEditor[pageId] = !this.showRawEditor[pageId];
  }

  onRawJsonChange(pageId: string, value: string) {
    this.pageBlocks[pageId] = value;
    try {
      this.commitPageBlocks(pageId, parseBlocks(JSON.parse(value || '[]')));
    } catch {
      // Keep invalid JSON in textarea until user fixes it.
    }
  }

  selectBlock(pageId: string, index: number) {
    this.selectedBlockByPage[pageId] = index;
  }

  getSelectedBlock(pageId: string): BuilderBlock | null {
    const selectedIndex = this.selectedBlockByPage[pageId];
    if (selectedIndex === null || selectedIndex === undefined) return null;
    return this.pageDraftBlocks[pageId]?.[selectedIndex] || null;
  }

  editableKeys(type: BlockType): string[] {
    return getEditablePropKeys(type);
  }

  undoPageChanges() {
    this.pageHistory = undoHistory(this.pageHistory);
    this.applyHistoryPresent();
  }

  redoPageChanges() {
    this.pageHistory = redoHistory(this.pageHistory);
    this.applyHistoryPresent();
  }

  togglePreview(pageId: string) {
    this.showPreviewByPage[pageId] = !this.showPreviewByPage[pageId];
  }

  blockSummary(block: BuilderBlock): string {
    if (block.type === 'hero') return block.props['title'] || 'Hero';
    if (block.type === 'text') return block.props['content'] || 'Texto';
    if (block.type === 'image') return block.props['url'] || 'Imagen';
    if (block.type === 'form') return block.props['title'] || 'Formulario';
    return block.props['text'] || 'Boton';
  }

  private commitPageBlocks(pageId: string, blocks: BuilderBlock[]) {
    const next = { ...this.pageDraftBlocks, [pageId]: blocks };
    this.pageHistory = pushHistory(this.pageHistory, next);
    this.applyHistoryPresent();
    const selected = this.selectedBlockByPage[pageId];
    if (typeof selected === 'number' && selected >= blocks.length) {
      this.selectedBlockByPage[pageId] = blocks.length ? blocks.length - 1 : null;
    }
    if (this.selectedBlockByPage[pageId] === null && blocks.length) {
      this.selectedBlockByPage[pageId] = 0;
    }
  }

  private applyHistoryPresent() {
    this.pageDraftBlocks = this.pageHistory.present;
    for (const [pageId, blocks] of Object.entries(this.pageDraftBlocks)) {
      this.pageBlocks[pageId] = JSON.stringify(serializeBlocks(blocks), null, 2);
    }
  }
}
