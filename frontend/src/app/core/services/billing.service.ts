import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

@Injectable({ providedIn: 'root' })
export class BillingService {
  private baseUrl = `${environment.apiUrl}/billing`;

  constructor(private http: HttpClient) {}

  getMetrics(periodDays = 30) {
    return this.http.get<any>(`${this.baseUrl}/metrics?periodDays=${periodDays}`);
  }

  listProducts() {
    return this.http.get<any[]>(`${this.baseUrl}/products`);
  }

  createProduct(data: { name: string; description?: string; isActive?: boolean }) {
    return this.http.post<any>(`${this.baseUrl}/products`, data);
  }

  updateProduct(id: string, data: any) {
    return this.http.patch<any>(`${this.baseUrl}/products/${id}`, data);
  }

  deleteProduct(id: string) {
    return this.http.delete<{ success: boolean }>(`${this.baseUrl}/products/${id}`);
  }

  listPrices(productId?: string) {
    const query = productId ? `?productId=${productId}` : '';
    return this.http.get<any[]>(`${this.baseUrl}/prices${query}`);
  }

  createPrice(data: {
    productId: string;
    amount: number;
    currency?: string;
    interval?: string;
  }) {
    return this.http.post<any>(`${this.baseUrl}/prices`, data);
  }

  listInvoices() {
    return this.http.get<any[]>(`${this.baseUrl}/invoices`);
  }

  createInvoice(data: any) {
    return this.http.post<any>(`${this.baseUrl}/invoices`, data);
  }

  recordPayment(data: { invoiceId: string; amount?: number; markSucceeded?: boolean }) {
    return this.http.post<any>(`${this.baseUrl}/payments`, data);
  }

  listSubscriptions() {
    return this.http.get<any[]>(`${this.baseUrl}/subscriptions`);
  }

  createSubscription(data: { contactId?: string; priceId: string }) {
    return this.http.post<any>(`${this.baseUrl}/subscriptions`, data);
  }
}
