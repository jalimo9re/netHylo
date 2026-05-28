import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { AffiliatesService } from '../../core/services/affiliates.service';

@Component({
  selector: 'app-affiliates',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold mb-4">Afiliados y referidos</h2>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6" *ngIf="metrics">
        <mat-card class="p-4">
          <div class="text-sm opacity-70">Clicks</div>
          <div class="text-2xl font-semibold">{{ metrics.clicks }}</div>
        </mat-card>
        <mat-card class="p-4">
          <div class="text-sm opacity-70">Conversiones</div>
          <div class="text-2xl font-semibold">{{ metrics.conversions }}</div>
        </mat-card>
        <mat-card class="p-4">
          <div class="text-sm opacity-70">Comisión pendiente</div>
          <div class="text-2xl font-semibold">{{ metrics.pendingCommission | currency: 'USD' }}</div>
        </mat-card>
        <mat-card class="p-4">
          <div class="text-sm opacity-70">Comisión pagada</div>
          <div class="text-2xl font-semibold">{{ metrics.paidCommission | currency: 'USD' }}</div>
        </mat-card>
      </div>

      <mat-card class="p-4 mb-6">
        <h3 class="font-semibold mb-3">Crear afiliado</h3>
        <div class="flex flex-wrap gap-2">
          <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="affiliateName" placeholder="Nombre" />
          <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="affiliateEmail" placeholder="Email" />
          <input class="border rounded px-3 py-2 bg-transparent w-32" type="number" [(ngModel)]="commissionRate" placeholder="% comisión" />
          <button mat-flat-button (click)="createAffiliate()">Crear</button>
        </div>
      </mat-card>

      <mat-card class="p-4 mb-6">
        <h3 class="font-semibold mb-3">Afiliados y links</h3>
        <div class="border border-white/10 rounded p-3 mb-3" *ngFor="let affiliate of affiliates">
          <div class="font-medium">{{ affiliate.name }} ({{ affiliate.commissionRate }}%)</div>
          <div class="text-sm opacity-70">{{ affiliate.email || 'Sin email' }}</div>
          <div class="flex gap-2 mt-2">
            <input class="border rounded px-2 py-1 bg-transparent" [(ngModel)]="newLinkCode[affiliate.id]" placeholder="Código (opcional)" />
            <input class="border rounded px-2 py-1 bg-transparent min-w-[260px]" [(ngModel)]="newLinkTarget[affiliate.id]" placeholder="URL destino (opcional)" />
            <button mat-stroked-button (click)="createLink(affiliate.id)">Crear link</button>
          </div>
          <div class="text-sm mt-2" *ngFor="let link of linksByAffiliate(affiliate.id)">
            /api/public/affiliates/{{ link.code }}/click · clicks: {{ link.clicks }} · conv: {{ link.conversions }}
          </div>
        </div>
      </mat-card>

      <mat-card class="p-4">
        <h3 class="font-semibold mb-3">Conversión manual</h3>
        <div class="flex flex-wrap gap-2 mb-3">
          <select class="border rounded px-3 py-2 bg-transparent min-w-[220px]" [(ngModel)]="conversionAffiliateId">
            <option value="">Selecciona afiliado</option>
            <option *ngFor="let affiliate of affiliates" [value]="affiliate.id">{{ affiliate.name }}</option>
          </select>
          <input class="border rounded px-3 py-2 bg-transparent w-32" type="number" [(ngModel)]="conversionAmount" placeholder="Monto" />
          <button mat-flat-button (click)="createManualConversion()">Registrar conversión</button>
        </div>
        <div class="text-sm py-2 border-b border-white/10" *ngFor="let conversion of conversions">
          {{ conversion.source }} · {{ conversion.amount | currency: conversion.currency }} · comisión
          {{ conversion.commissionAmount | currency: conversion.currency }} · {{ conversion.status }}
        </div>
      </mat-card>
    </div>
  `,
})
export class AffiliatesComponent implements OnInit {
  metrics: any = null;
  affiliates: any[] = [];
  links: any[] = [];
  conversions: any[] = [];

  affiliateName = '';
  affiliateEmail = '';
  commissionRate = 10;

  newLinkCode: Record<string, string> = {};
  newLinkTarget: Record<string, string> = {};
  conversionAffiliateId = '';
  conversionAmount = 0;

  constructor(private affiliatesService: AffiliatesService) {}

  ngOnInit(): void {
    this.reload();
  }

  reload() {
    this.affiliatesService.getMetrics().subscribe((data) => (this.metrics = data));
    this.affiliatesService.listAffiliates().subscribe((data) => (this.affiliates = data));
    this.affiliatesService.listLinks().subscribe((data) => (this.links = data));
    this.affiliatesService.listConversions().subscribe((data) => (this.conversions = data));
  }

  linksByAffiliate(affiliateId: string) {
    return this.links.filter((item) => item.affiliateId === affiliateId);
  }

  createAffiliate() {
    if (!this.affiliateName.trim()) return;
    this.affiliatesService
      .createAffiliate({
        name: this.affiliateName,
        email: this.affiliateEmail || undefined,
        commissionRate: Number(this.commissionRate || 10),
      })
      .subscribe(() => {
        this.affiliateName = '';
        this.affiliateEmail = '';
        this.commissionRate = 10;
        this.reload();
      });
  }

  createLink(affiliateId: string) {
    this.affiliatesService
      .createLink({
        affiliateId,
        code: this.newLinkCode[affiliateId] || undefined,
        targetUrl: this.newLinkTarget[affiliateId] || undefined,
      })
      .subscribe(() => {
        this.newLinkCode[affiliateId] = '';
        this.newLinkTarget[affiliateId] = '';
        this.reload();
      });
  }

  createManualConversion() {
    const amount = Number(this.conversionAmount || 0);
    if (!this.conversionAffiliateId || !amount) return;
    this.affiliatesService
      .createConversion({ affiliateId: this.conversionAffiliateId, amount, currency: 'USD' })
      .subscribe(() => {
        this.conversionAmount = 0;
        this.reload();
      });
  }
}
