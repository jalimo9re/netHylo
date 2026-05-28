import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { ReputationService, ReviewMetrics } from '../../core/services/reputation.service';

@Component({
  selector: 'app-reputation',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold mb-4">Reputación y reseñas</h2>

      <mat-card class="p-4 mb-4" *ngIf="metrics">
        <h3 class="font-semibold mb-2">Dashboard</h3>
        <div class="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
          <div>
            <div class="opacity-70">Promedio</div>
            <div class="text-2xl font-semibold">{{ metrics.avgRating }} ★</div>
          </div>
          <div>
            <div class="opacity-70">Total reseñas</div>
            <div class="text-2xl font-semibold">{{ metrics.totalCount }}</div>
          </div>
          <div class="md:col-span-2">
            <div class="opacity-70 mb-1">Por estrellas</div>
            <div *ngFor="let star of starLevels" class="flex items-center gap-2">
              <span class="w-12">{{ star }}★</span>
              <div class="flex-1 h-2 bg-white/10 rounded">
                <div
                  class="h-2 bg-amber-400 rounded"
                  [style.width.%]="barWidth(star)"
                ></div>
              </div>
              <span class="w-8 text-right">{{ metrics.countByStars[star] || 0 }}</span>
            </div>
          </div>
        </div>
      </mat-card>

      <mat-card class="p-4 mb-4">
        <h3 class="font-semibold mb-3">Nueva solicitud de reseña</h3>
        <div class="flex flex-wrap gap-2 mb-2">
          <input
            class="border rounded px-3 py-2 bg-transparent min-w-[200px]"
            [(ngModel)]="campaignName"
            placeholder="Nombre campaña"
          />
          <input
            class="border rounded px-3 py-2 bg-transparent min-w-[240px]"
            [(ngModel)]="campaignMessage"
            placeholder="Mensaje opcional"
          />
          <input
            class="border rounded px-3 py-2 bg-transparent w-28"
            [(ngModel)]="expiresInDays"
            type="number"
            min="1"
            placeholder="Días validez"
          />
          <button mat-flat-button (click)="createCampaign()" [disabled]="!campaignName.trim()">
            Crear campaña
          </button>
        </div>
        <p class="text-sm text-amber-300" *ngIf="lastPublicUrl">
          Link público: <code>{{ lastPublicUrl }}</code>
        </p>
      </mat-card>

      <div class="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <mat-card class="p-4">
          <h3 class="font-semibold mb-2">Solicitudes</h3>
          <div *ngIf="!requests.length" class="text-sm opacity-70">Sin solicitudes aún.</div>
          <div *ngFor="let req of requests" class="py-2 border-b border-white/10 text-sm">
            <div class="font-medium">{{ req.name }}</div>
            <div class="opacity-70">{{ req.status }} · {{ req.createdAt | date: 'short' }}</div>
          </div>
        </mat-card>

        <mat-card class="p-4">
          <h3 class="font-semibold mb-2">Reseñas recibidas</h3>
          <div *ngIf="!reviews.length" class="text-sm opacity-70">Sin reseñas aún.</div>
          <div *ngFor="let review of reviews" class="py-3 border-b border-white/10">
            <div class="flex items-center justify-between gap-2">
              <div>
                <span class="font-medium">{{ review.reviewerName || 'Anónimo' }}</span>
                <span class="ml-2 text-amber-300">{{ review.rating }}★</span>
              </div>
              <span class="text-xs opacity-60">{{ review.createdAt | date: 'short' }}</span>
            </div>
            <p class="text-sm mt-1 opacity-90" *ngIf="review.comment">{{ review.comment }}</p>
            <div class="mt-2" *ngIf="review.response">
              <div class="text-xs opacity-60">Tu respuesta</div>
              <p class="text-sm">{{ review.response }}</p>
            </div>
            <div class="mt-2 flex gap-2" *ngIf="!review.response">
              <input
                class="border rounded px-2 py-1 bg-transparent flex-1 text-sm"
                [(ngModel)]="responseDrafts[review.id]"
                placeholder="Responder reseña..."
              />
              <button
                mat-stroked-button
                (click)="respond(review.id)"
                [disabled]="!responseDrafts[review.id]?.trim()"
              >
                Responder
              </button>
            </div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
})
export class ReputationComponent implements OnInit {
  metrics: ReviewMetrics | null = null;
  requests: any[] = [];
  reviews: any[] = [];
  campaignName = '';
  campaignMessage = '';
  expiresInDays: number | null = 30;
  lastPublicUrl = '';
  responseDrafts: Record<string, string> = {};
  starLevels = [5, 4, 3, 2, 1];

  constructor(private reputationService: ReputationService) {}

  ngOnInit(): void {
    this.refresh();
  }

  refresh() {
    this.reputationService.getMetrics().subscribe((data) => (this.metrics = data));
    this.reputationService.listRequests().subscribe((data) => (this.requests = data));
    this.reputationService.listReviews().subscribe((data) => (this.reviews = data));
  }

  createCampaign() {
    if (!this.campaignName.trim()) return;
    this.reputationService
      .createCampaign({
        name: this.campaignName.trim(),
        message: this.campaignMessage.trim() || undefined,
        expiresInDays: this.expiresInDays || undefined,
      })
      .subscribe((result) => {
        this.lastPublicUrl = result.publicUrl;
        this.campaignName = '';
        this.campaignMessage = '';
        this.refresh();
      });
  }

  respond(reviewId: string) {
    const response = this.responseDrafts[reviewId]?.trim();
    if (!response) return;
    this.reputationService.respondToReview(reviewId, response).subscribe(() => {
      delete this.responseDrafts[reviewId];
      this.refresh();
    });
  }

  barWidth(star: number): number {
    if (!this.metrics?.totalCount) return 0;
    const count = this.metrics.countByStars[star] || 0;
    return Math.round((count / this.metrics.totalCount) * 100);
  }
}
