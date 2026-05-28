import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import {
  Campaign,
  CampaignChannel,
  CampaignsService,
  CampaignStats,
} from '../../core/services/campaigns.service';
import { ContactsService } from '../../core/services/contacts.service';

@Component({
  selector: 'app-campaigns',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule, MatIconModule],
  template: `
    <div class="p-3 sm:p-6">
      <h2 class="text-xl font-semibold mb-4">Campañas de marketing</h2>

      <mat-card class="p-4 mb-6">
        <h3 class="font-semibold mb-3">Nueva campaña</h3>
        <div class="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3 mb-3">
          <input class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="form.name" placeholder="Nombre" />
          <select class="border rounded px-3 py-2 bg-transparent" [(ngModel)]="form.channel">
            <option value="email">Email</option>
            <option value="sms">SMS</option>
          </select>
          <input
            *ngIf="form.channel === 'email'"
            class="border rounded px-3 py-2 bg-transparent"
            [(ngModel)]="form.subject"
            placeholder="Asunto"
          />
          <input
            class="border rounded px-3 py-2 bg-transparent"
            type="datetime-local"
            [(ngModel)]="form.scheduledAt"
          />
        </div>
        <textarea
          class="border rounded px-3 py-2 bg-transparent w-full mb-3"
          rows="3"
          [(ngModel)]="form.body"
          placeholder="Contenido del mensaje"
        ></textarea>
        <div class="flex flex-col sm:flex-row flex-wrap gap-2 items-stretch sm:items-center">
          <select
            class="border rounded px-3 py-2 bg-transparent min-w-[200px] w-full sm:w-auto"
            multiple
            [(ngModel)]="form.contactIds"
          >
            <option *ngFor="let c of contacts" [value]="c.id">
              {{ c.name || c.email || c.phone }}
            </option>
          </select>
          <button mat-flat-button color="primary" class="w-full sm:w-auto" (click)="createCampaign()">Crear campaña</button>
        </div>
      </mat-card>

      <div class="grid grid-cols-1 xl:grid-cols-2 gap-4">
        <mat-card class="p-4">
          <h3 class="font-semibold mb-3">Campañas</h3>
          <div
            *ngFor="let c of campaigns"
            class="py-3 border-b border-white/10 cursor-pointer hover:bg-white/5 px-2 rounded"
            [ngClass]="{ 'bg-white/5': selected?.id === c.id }"
            (click)="selectCampaign(c)"
          >
            <div class="flex justify-between items-center gap-2">
              <span class="font-medium">{{ c.name }}</span>
              <span class="text-xs uppercase opacity-70">{{ c.status }}</span>
            </div>
            <div class="text-xs opacity-70 mt-1">
              {{ c.channel }} · {{ c.contactIds?.length || 0 }} contactos
              <span *ngIf="c.scheduledAt"> · {{ c.scheduledAt | date: 'short' }}</span>
            </div>
            <div class="flex gap-2 mt-2" *ngIf="selected?.id === c.id">
              <button mat-stroked-button (click)="scheduleCampaign(c); $event.stopPropagation()">
                Programar / enviar
              </button>
              <button
                mat-stroked-button
                color="warn"
                *ngIf="c.status !== 'completed' && c.status !== 'cancelled'"
                (click)="cancelCampaign(c); $event.stopPropagation()"
              >
                Cancelar
              </button>
            </div>
          </div>
        </mat-card>

        <mat-card class="p-4" *ngIf="stats">
          <h3 class="font-semibold mb-3">Rendimiento · {{ stats.name }}</h3>
          <div class="grid grid-cols-2 gap-3 text-sm">
            <div class="glass p-3 rounded-xl">Destinatarios: <strong>{{ stats.totalRecipients }}</strong></div>
            <div class="glass p-3 rounded-xl">Enviados: <strong>{{ stats.sent }}</strong></div>
            <div class="glass p-3 rounded-xl">Fallidos: <strong>{{ stats.failed }}</strong></div>
            <div class="glass p-3 rounded-xl">Rebotes: <strong>{{ stats.bounced }}</strong></div>
            <div class="glass p-3 rounded-xl">Aperturas: <strong>{{ stats.opened }} ({{ stats.openRate }}%)</strong></div>
            <div class="glass p-3 rounded-xl">Clics: <strong>{{ stats.clicked }} ({{ stats.clickRate }}%)</strong></div>
          </div>
        </mat-card>
      </div>
    </div>
  `,
})
export class CampaignsComponent implements OnInit {
  campaigns: Campaign[] = [];
  contacts: any[] = [];
  selected: Campaign | null = null;
  stats: CampaignStats | null = null;

  form = {
    name: '',
    channel: 'email' as CampaignChannel,
    subject: '',
    body: '',
    scheduledAt: '',
    contactIds: [] as string[],
  };

  constructor(
    private campaignsService: CampaignsService,
    private contactsService: ContactsService,
  ) {}

  ngOnInit(): void {
    this.load();
    this.contactsService.findAll().subscribe((data) => (this.contacts = data));
  }

  load() {
    this.campaignsService.list().subscribe((data) => (this.campaigns = data));
  }

  createCampaign() {
    if (!this.form.name.trim() || !this.form.body.trim()) return;
    this.campaignsService
      .create({
        name: this.form.name,
        channel: this.form.channel,
        subject: this.form.channel === 'email' ? this.form.subject : undefined,
        body: this.form.body,
        contactIds: this.form.contactIds,
        scheduledAt: this.form.scheduledAt || undefined,
      })
      .subscribe(() => {
        this.form = {
          name: '',
          channel: 'email',
          subject: '',
          body: '',
          scheduledAt: '',
          contactIds: [],
        };
        this.load();
      });
  }

  selectCampaign(campaign: Campaign) {
    this.selected = campaign;
    this.campaignsService.getStats(campaign.id).subscribe((data) => (this.stats = data));
  }

  scheduleCampaign(campaign: Campaign) {
    this.campaignsService.schedule(campaign.id, campaign.scheduledAt || undefined).subscribe(() => {
      this.load();
      if (this.selected?.id === campaign.id) this.selectCampaign(campaign);
    });
  }

  cancelCampaign(campaign: Campaign) {
    this.campaignsService.cancel(campaign.id).subscribe(() => this.load());
  }
}
