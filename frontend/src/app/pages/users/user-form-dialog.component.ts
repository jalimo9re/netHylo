import { Component, Inject } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatDialogModule, MatDialogRef, MAT_DIALOG_DATA } from '@angular/material/dialog';
import { MatButtonModule } from '@angular/material/button';
import { MatSelectModule } from '@angular/material/select';
import { UsersService, User } from '../../core/services/users.service';

@Component({
  selector: 'app-user-form-dialog',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatDialogModule,
    MatButtonModule,
    MatSelectModule,
  ],
  templateUrl: './user-form-dialog.component.html',
})
export class UserFormDialogComponent {
  isEdit: boolean;
  loading = false;
  error = '';

  firstName = '';
  lastName = '';
  email = '';
  password = '';
  role = 'agent';

  roles = [
    { value: 'admin', label: 'Administrador' },
    { value: 'agent', label: 'Agente' },
  ];

  constructor(
    private dialogRef: MatDialogRef<UserFormDialogComponent>,
    @Inject(MAT_DIALOG_DATA) public data: { user: User | null },
    private usersService: UsersService,
  ) {
    this.isEdit = !!data.user;
    if (data.user) {
      this.firstName = data.user.firstName;
      this.lastName = data.user.lastName;
      this.email = data.user.email;
      this.role = data.user.role;
    }
  }

  isValid(): boolean {
    if (!this.firstName || !this.lastName || !this.email) return false;
    if (!this.isEdit && !this.password) return false;
    return true;
  }

  save() {
    this.loading = true;
    this.error = '';

    if (this.isEdit) {
      const update: any = {
        firstName: this.firstName,
        lastName: this.lastName,
        role: this.role,
      };
      this.usersService.update(this.data.user!.id, update).subscribe({
        next: () => this.dialogRef.close(true),
        error: (err) => {
          this.error = err.error?.message || 'Error al actualizar';
          this.loading = false;
        },
      });
    } else {
      this.usersService
        .create({
          firstName: this.firstName,
          lastName: this.lastName,
          email: this.email,
          password: this.password,
          role: this.role,
        })
        .subscribe({
          next: () => this.dialogRef.close(true),
          error: (err) => {
            this.error = err.error?.message || 'Error al crear usuario';
            this.loading = false;
          },
        });
    }
  }

  cancel() {
    this.dialogRef.close(false);
  }
}
