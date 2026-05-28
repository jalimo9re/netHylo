import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CrmService } from '../../core/services/crm.service';

@Component({
  selector: 'app-calendar',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule],
  template: `
    <div class="p-3 sm:p-6">
      <h2 class="text-xl font-semibold mb-4">Calendario</h2>
      <div class="flex flex-col sm:flex-row gap-2 mb-4">
        <input class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="title" placeholder="Título cita" />
        <input class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="startAt" type="datetime-local" />
        <input class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="endAt" type="datetime-local" />
        <input class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="bookingSlug" placeholder="booking slug opcional" />
        <button mat-flat-button class="w-full sm:w-auto" (click)="createEvent()">Crear evento</button>
      </div>

      <div class="grid gap-3">
        <mat-card class="p-4" *ngFor="let event of events">
          <div class="font-medium">{{ event.title }}</div>
          <div class="text-sm opacity-70">{{ event.startAt }} - {{ event.endAt }}</div>
          <div class="text-xs opacity-70">Booking: {{ event.metadata?.bookingStatus || '-' }}</div>
          <div class="text-xs opacity-70" *ngIf="event.metadata?.bookingSlug">Link: /crm/calendar/public/slots/{{ event.metadata.bookingSlug }}</div>
          <div class="mt-2 flex flex-wrap gap-2">
            <button mat-button (click)="markBooked(event)" [disabled]="event.metadata?.bookingStatus !== 'available'">Reservar (demo)</button>
            <button mat-button color="warn" (click)="deleteEvent(event.id)">Eliminar</button>
          </div>
        </mat-card>
      </div>
    </div>
  `,
})
export class CalendarComponent implements OnInit {
  events: any[] = [];
  title = '';
  startAt = '';
  endAt = '';
  bookingSlug = '';

  constructor(private crmService: CrmService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.crmService.listCalendarEvents().subscribe((data) => (this.events = data));
  }

  createEvent() {
    if (!this.title.trim() || !this.startAt || !this.endAt) return;
    this.crmService
      .createCalendarEvent({
        title: this.title,
        startAt: new Date(this.startAt),
        endAt: new Date(this.endAt),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone,
        metadata: {
          bookingEnabled: !!this.bookingSlug.trim(),
          bookingSlug: this.bookingSlug.trim() || null,
        },
      })
      .subscribe(() => {
        this.title = '';
        this.startAt = '';
        this.endAt = '';
        this.bookingSlug = '';
        this.load();
      });
  }

  deleteEvent(id: string) {
    this.crmService.deleteCalendarEvent(id).subscribe(() => this.load());
  }

  markBooked(event: any) {
    this.crmService
      .createPublicBooking(event.id, {
        name: 'Demo Booking',
        email: `demo+${Date.now()}@example.com`,
      })
      .subscribe(() => this.load());
  }
}
