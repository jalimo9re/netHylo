import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import {
  MAT_DIALOG_DATA,
  MatDialogRef,
  MatDialogModule,
} from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { UsersService, User } from '../../core/services/users.service';

@Component({
  selector: 'app-reset-password-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, MatDialogModule, MatIconModule],
  template: `
    <h2 mat-dialog-title class="!mb-1">Resetear contraseña</h2>

    <mat-dialog-content class="flex flex-col gap-5 py-4">
      <p class="text-sm text-slate-400">
        Cambiando la contraseña de
        <span class="text-white font-semibold">{{ data.user.firstName }} {{ data.user.lastName }}</span>
        <span class="text-slate-500">({{ data.user.email }})</span>
      </p>

      @if (error) {
        <div class="bg-rose-500/15 border border-rose-500/30 text-rose-300 px-4 py-3 rounded-xl text-sm">
          {{ error }}
        </div>
      }

      @if (success) {
        <div class="bg-green-500/15 border border-green-500/30 text-green-300 px-4 py-3 rounded-xl text-sm">
          Contraseña actualizada correctamente
        </div>
      }

      <div class="space-y-1.5">
        <label class="text-[11px] font-bold text-slate-400 uppercase tracking-wider ml-1">Nueva contraseña</label>
        <div class="flex items-center gap-3 bg-white/5 border border-border rounded-xl px-4 py-2.5 focus-within:border-primary/50 transition-all">
          <mat-icon class="text-slate-500 text-sm">lock</mat-icon>
          <input
            [type]="showPassword ? 'text' : 'password'"
            [(ngModel)]="newPassword"
            placeholder="Minimo 6 caracteres"
            class="bg-transparent border-none outline-none text-sm w-full text-slate-200 placeholder:text-slate-500"
          />
          <button type="button" (click)="showPassword = !showPassword" class="text-slate-500 hover:text-slate-300">
            <mat-icon class="text-sm">{{ showPassword ? 'visibility_off' : 'visibility' }}</mat-icon>
          </button>
        </div>
      </div>
    </mat-dialog-content>

    <mat-dialog-actions align="end" class="!pt-4">
      <button mat-button class="!text-slate-300 hover:!bg-white/10" (click)="dialogRef.close()">
        {{ success ? 'Cerrar' : 'Cancelar' }}
      </button>
      @if (!success) {
        <button
          class="bg-amber-500 hover:bg-amber-600 text-white font-bold py-2.5 px-4 rounded-xl shadow-lg shadow-amber-500/20 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          [disabled]="newPassword.length < 6 || loading"
          (click)="reset()"
        >
          {{ loading ? 'Guardando...' : 'Resetear' }}
        </button>
      }
    </mat-dialog-actions>
  `,
})
export class ResetPasswordDialogComponent {
  newPassword = '';
  showPassword = false;
  loading = false;
  error = '';
  success = false;

  constructor(
    public dialogRef: MatDialogRef<ResetPasswordDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: User },
    private usersService: UsersService,
  ) {}

  reset() {
    this.loading = true;
    this.error = '';
    this.usersService.resetPassword(this.data.user.id, this.newPassword).subscribe({
      next: () => {
        this.loading = false;
        this.success = true;
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al resetear la contraseña';
        this.loading = false;
      },
    });
  }
}
