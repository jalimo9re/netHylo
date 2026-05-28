import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { CrmService } from '../../core/services/crm.service';

@Component({
  selector: 'app-forms',
  standalone: true,
  imports: [CommonModule, FormsModule, MatButtonModule, MatCardModule],
  template: `
    <div class="p-3 sm:p-6">
      <h2 class="text-xl font-semibold mb-4">Formularios</h2>
      <div class="flex flex-col sm:flex-row gap-2 mb-4">
        <input class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="formName" placeholder="Nombre formulario" />
        <input class="border rounded px-3 py-2 bg-transparent w-full sm:w-auto" [(ngModel)]="formSlug" placeholder="Slug público" />
        <textarea
          class="border rounded px-3 py-2 bg-transparent w-full sm:min-w-[320px]"
          [(ngModel)]="fieldsJson"
          placeholder='JSON campos: [{"key":"name","type":"text","required":true}]'
        ></textarea>
        <button mat-flat-button class="w-full sm:w-auto" (click)="createForm()">Crear</button>
      </div>

      <div class="grid gap-3 mb-6">
        <mat-card class="p-4" *ngFor="let form of forms">
          <div class="font-medium">{{ form.name }}</div>
          <div class="text-sm opacity-70">/{{ form.slug }} - v{{ form.version }} - {{ form.isPublished ? 'Publicado' : 'Borrador' }}</div>
          <div class="text-xs opacity-70 mb-2">Campos: {{ form.fields?.length || 0 }}</div>
          <div class="flex flex-wrap gap-2">
            <button mat-stroked-button (click)="togglePublish(form)">
              {{ form.isPublished ? 'Despublicar' : 'Publicar' }}
            </button>
            <button mat-stroked-button (click)="editForm(form)">Editar campos</button>
            <button mat-stroked-button (click)="openSubmissions(form)">Ver submissions</button>
          </div>
          <div class="mt-2" *ngIf="editingFormId === form.id">
            <textarea class="border rounded px-3 py-2 bg-transparent w-full min-h-[120px]" [(ngModel)]="editFieldsJson"></textarea>
            <div class="mt-2 flex gap-2">
              <button mat-flat-button (click)="saveForm(form.id)">Guardar</button>
              <button mat-stroked-button (click)="cancelEdit()">Cancelar</button>
            </div>
          </div>
        </mat-card>
      </div>

      <mat-card class="p-4" *ngIf="selectedFormForSubmissions">
        <h3 class="font-semibold mb-2">Submissions: {{ selectedFormForSubmissions.name }}</h3>
        <div class="text-sm opacity-70 mb-2">Total cargadas: {{ submissions.length }}</div>
        <div class="py-2 border-b border-white/10 text-sm" *ngFor="let submission of submissions">
          <div class="opacity-80">{{ submission.createdAt | date: 'short' }}</div>
          <div>Contacto: {{ submission.contactId || '-' }} | Deal: {{ submission.dealId || '-' }}</div>
          <div class="opacity-70">UTM: {{ submission.utm | json }}</div>
        </div>
      </mat-card>
    </div>
  `,
})
export class FormsComponent implements OnInit {
  forms: any[] = [];
  submissions: any[] = [];
  selectedFormForSubmissions: any = null;
  formName = '';
  formSlug = '';
  fieldsJson = JSON.stringify(
    [
      { key: 'name', type: 'text', required: true, mapTo: 'contact.name' },
      { key: 'email', type: 'email', required: true, mapTo: 'contact.email' },
      { key: 'phone', type: 'text', required: false, mapTo: 'contact.phone' },
      { key: 'budget', type: 'number', required: false, mapTo: 'deal.amount' },
    ],
    null,
    2,
  );
  editingFormId: string | null = null;
  editFieldsJson = '';

  constructor(private crmService: CrmService) {}

  ngOnInit(): void {
    this.load();
  }

  load() {
    this.crmService.listForms().subscribe((data) => (this.forms = data));
  }

  createForm() {
    if (!this.formName.trim() || !this.formSlug.trim()) return;
    let fields: any[] = [];
    try {
      fields = JSON.parse(this.fieldsJson || '[]');
    } catch {
      return;
    }
    this.crmService
      .createForm({
        name: this.formName,
        slug: this.formSlug,
        isPublished: false,
        fields,
      })
      .subscribe(() => {
        this.formName = '';
        this.formSlug = '';
        this.load();
      });
  }

  togglePublish(form: any) {
    this.crmService.publishForm(form.id, !form.isPublished).subscribe(() => this.load());
  }

  editForm(form: any) {
    this.editingFormId = form.id;
    this.editFieldsJson = JSON.stringify(form.fields || [], null, 2);
  }

  cancelEdit() {
    this.editingFormId = null;
    this.editFieldsJson = '';
  }

  saveForm(formId: string) {
    let fields: any[] = [];
    try {
      fields = JSON.parse(this.editFieldsJson || '[]');
    } catch {
      return;
    }
    this.crmService.updateForm(formId, { fields }).subscribe(() => {
      this.cancelEdit();
      this.load();
    });
  }

  openSubmissions(form: any) {
    this.selectedFormForSubmissions = form;
    this.crmService.listFormSubmissions(form.id).subscribe((data) => {
      this.submissions = data;
    });
  }
}
