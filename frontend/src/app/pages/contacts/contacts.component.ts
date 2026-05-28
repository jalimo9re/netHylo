import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { MatCardModule } from '@angular/material/card';
import { ContactsService } from '../../core/services/contacts.service';

@Component({
  selector: 'app-contacts',
  standalone: true,
  imports: [CommonModule, MatCardModule],
  template: `
    <div class="p-6">
      <h2 class="text-xl font-semibold mb-4">Contactos</h2>
      <div class="grid gap-3">
        <mat-card *ngFor="let contact of contacts" class="p-4">
          <div class="font-medium">{{ contact.name || 'Sin nombre' }}</div>
          <div class="text-sm opacity-70">{{ contact.email || contact.phone || '-' }}</div>
        </mat-card>
      </div>
    </div>
  `,
})
export class ContactsComponent implements OnInit {
  contacts: any[] = [];

  constructor(private contactsService: ContactsService) {}

  ngOnInit(): void {
    this.contactsService.findAll().subscribe((data) => (this.contacts = data));
  }
}
