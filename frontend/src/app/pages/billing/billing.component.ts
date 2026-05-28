import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { BillingService } from '../../core/services/billing.service';

@Component({
  selector: 'app-billing',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold mb-4">Facturación y pagos</h2>

      <div class="grid grid-cols-1 md:grid-cols-4 gap-3 mb-6" *ngIf="metrics">
        <mat-card class="p-4">
          <div class="text-sm opacity-70">MRR (aprox.)</div>
          <div class="text-2xl font-semibold">{{ metrics.mrr | currency: 'USD' }}</div>
        </mat-card>
        <mat-card class="p-4">
          <div class="text-sm opacity-70">Ingresos ({{ metrics.periodDays }}d)</div>
          <div class="text-2xl font-semibold">{{ metrics.periodRevenue | currency: 'USD' }}</div>
        </mat-card>
        <mat-card class="p-4">
          <div class="text-sm opacity-70">Facturas pendientes</div>
          <div class="text-2xl font-semibold">{{ metrics.pendingInvoices }}</div>
        </mat-card>
        <mat-card class="p-4">
          <div class="text-sm opacity-70">Suscripciones activas</div>
          <div class="text-2xl font-semibold">{{ metrics.activeSubscriptions }}</div>
          <div class="text-xs opacity-60 mt-1" *ngIf="metrics.mockEnabled">Mock Stripe activo</div>
        </mat-card>
      </div>

      <mat-card class="p-4 mb-6">
        <h3 class="font-semibold mb-3">Productos y precios</h3>
        <div class="flex flex-wrap gap-2 mb-4">
          <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="productName" placeholder="Nombre producto" />
          <button mat-flat-button (click)="createProduct()">Crear producto</button>
        </div>
        <div class="grid gap-3">
          <div class="border border-white/10 rounded p-3" *ngFor="let product of products">
            <div class="font-medium">{{ product.name }}</div>
            <div class="text-sm opacity-70 mb-2">{{ product.description || 'Sin descripción' }}</div>
            <div class="flex flex-wrap gap-2 mb-2">
              <input
                class="border rounded px-2 py-1 bg-transparent w-24"
                type="number"
                [(ngModel)]="priceAmounts[product.id]"
                placeholder="Monto"
              />
              <select class="border rounded px-2 py-1 bg-transparent" [(ngModel)]="priceIntervals[product.id]">
                <option value="one_time">Único</option>
                <option value="month">Mensual</option>
                <option value="year">Anual</option>
              </select>
              <button mat-stroked-button (click)="addPrice(product.id)">Añadir precio</button>
            </div>
            <div class="text-sm" *ngFor="let price of pricesForProduct(product.id)">
              {{ price.amount | currency: price.currency }} · {{ price.interval }}
              <span class="opacity-60" *ngIf="price.externalPriceId">({{ price.externalPriceId }})</span>
            </div>
          </div>
        </div>
      </mat-card>

      <mat-card class="p-4 mb-6">
        <h3 class="font-semibold mb-3">Nueva factura</h3>
        <div class="flex flex-wrap gap-2 mb-3">
          <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="invoiceContactId" placeholder="Contact ID (opcional)" />
          <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="invoiceDealId" placeholder="Deal ID (opcional)" />
          <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="invoiceDescription" placeholder="Descripción ítem" />
          <input class="border rounded px-3 py-2 bg-transparent w-28" type="number" [(ngModel)]="invoiceAmount" placeholder="Monto" />
          <button mat-flat-button (click)="createInvoice()">Crear factura</button>
        </div>
        <div class="grid gap-2">
          <div class="border-b border-white/10 py-2 text-sm" *ngFor="let inv of invoices">
            <div class="flex justify-between gap-2 flex-wrap">
              <span>#{{ inv.id | slice: 0 : 8 }} · {{ inv.status }} · {{ inv.total | currency: inv.currency }}</span>
              <span class="opacity-70">
                Contacto: {{ inv.contactId || '-' }} · Deal: {{ inv.dealId || '-' }}
              </span>
            </div>
            <div class="flex gap-2 mt-1" *ngIf="inv.status === 'open'">
              <button mat-stroked-button (click)="recordPayment(inv.id, false)">Registrar pago pendiente</button>
              <button mat-flat-button (click)="recordPayment(inv.id, true)">Marcar pagado</button>
            </div>
          </div>
        </div>
      </mat-card>

      <mat-card class="p-4">
        <h3 class="font-semibold mb-3">Suscripciones</h3>
        <div class="flex flex-wrap gap-2 mb-3">
          <select class="border rounded px-3 py-2 bg-transparent min-w-[200px]" [(ngModel)]="subscriptionPriceId">
            <option value="">Selecciona precio recurrente</option>
            <option *ngFor="let price of recurringPrices" [value]="price.id">
              {{ price.product?.name || 'Producto' }} — {{ price.amount | currency: price.currency }}/{{ price.interval }}
            </option>
          </select>
          <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="subscriptionContactId" placeholder="Contact ID (opcional)" />
          <button mat-flat-button (click)="createSubscription()" [disabled]="!subscriptionPriceId">Crear suscripción</button>
        </div>
        <div class="text-sm py-2 border-b border-white/10" *ngFor="let sub of subscriptions">
          {{ sub.status }} · {{ sub.price?.amount | currency: sub.price?.currency }}/{{ sub.price?.interval }}
          · hasta {{ sub.currentPeriodEnd | date: 'shortDate' }}
        </div>
      </mat-card>
    </div>
  `,
})
export class BillingComponent implements OnInit {
  metrics: any = null;
  products: any[] = [];
  prices: any[] = [];
  invoices: any[] = [];
  subscriptions: any[] = [];

  productName = '';
  priceAmounts: Record<string, number> = {};
  priceIntervals: Record<string, string> = {};

  invoiceContactId = '';
  invoiceDealId = '';
  invoiceDescription = 'Servicio';
  invoiceAmount = 0;

  subscriptionPriceId = '';
  subscriptionContactId = '';

  constructor(private billingService: BillingService) {}

  ngOnInit(): void {
    this.reload();
  }

  get recurringPrices() {
    return this.prices.filter((p) => p.interval === 'month' || p.interval === 'year');
  }

  pricesForProduct(productId: string) {
    return this.prices.filter((p) => p.productId === productId);
  }

  reload() {
    this.billingService.getMetrics().subscribe((m) => (this.metrics = m));
    this.billingService.listProducts().subscribe((p) => (this.products = p));
    this.billingService.listPrices().subscribe((pr) => (this.prices = pr));
    this.billingService.listInvoices().subscribe((i) => (this.invoices = i));
    this.billingService.listSubscriptions().subscribe((s) => (this.subscriptions = s));
  }

  createProduct() {
    if (!this.productName.trim()) return;
    this.billingService.createProduct({ name: this.productName }).subscribe(() => {
      this.productName = '';
      this.reload();
    });
  }

  addPrice(productId: string) {
    const amount = Number(this.priceAmounts[productId] ?? 0);
    if (!amount) return;
    this.billingService
      .createPrice({
        productId,
        amount,
        interval: this.priceIntervals[productId] || 'one_time',
      })
      .subscribe(() => this.reload());
  }

  createInvoice() {
    const amount = Number(this.invoiceAmount);
    if (!amount) return;
    this.billingService
      .createInvoice({
        contactId: this.invoiceContactId || undefined,
        dealId: this.invoiceDealId || undefined,
        status: 'open',
        items: [{ description: this.invoiceDescription, quantity: 1, unitAmount: amount }],
      })
      .subscribe(() => {
        this.invoiceAmount = 0;
        this.reload();
      });
  }

  recordPayment(invoiceId: string, markSucceeded: boolean) {
    this.billingService.recordPayment({ invoiceId, markSucceeded }).subscribe(() => this.reload());
  }

  createSubscription() {
    if (!this.subscriptionPriceId) return;
    this.billingService
      .createSubscription({
        priceId: this.subscriptionPriceId,
        contactId: this.subscriptionContactId || undefined,
      })
      .subscribe(() => {
        this.subscriptionPriceId = '';
        this.subscriptionContactId = '';
        this.reload();
      });
  }
}
