import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatCardModule } from '@angular/material/card';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialogModule, MatDialog } from '@angular/material/dialog';
import { MatTooltipModule } from '@angular/material/tooltip';
import { UsersService, User } from '../../core/services/users.service';
import { AuthService } from '../../core/services/auth.service';
import { UserFormDialogComponent } from './user-form-dialog.component';

@Component({
  selector: 'app-users',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatButtonModule,
    MatIconModule,
    MatChipsModule,
    MatTooltipModule,
    MatDialogModule,
  ],
  templateUrl: './users.component.html',
})
export class UsersComponent implements OnInit {
  users: User[] = [];
  loading = true;
  canManage = false;

  constructor(
    private usersService: UsersService,
    private authService: AuthService,
    private dialog: MatDialog,
  ) {
    const role = this.authService.currentUser()?.role;
    this.canManage = role === 'admin' || role === 'superadmin';
  }

  ngOnInit() {
    this.loadUsers();
  }

  loadUsers() {
    this.loading = true;
    this.usersService.findAll().subscribe((data) => {
      this.users = data;
      this.loading = false;
    });
  }

  getRoleLabel(role: string): string {
    const labels: Record<string, string> = {
      superadmin: 'Super Admin',
      admin: 'Administrador',
      agent: 'Agente',
    };
    return labels[role] || role;
  }

  getRoleColor(role: string): string {
    const colors: Record<string, string> = {
      superadmin: 'bg-purple-500/20 text-purple-400',
      admin: 'bg-blue-500/20 text-blue-400',
      agent: 'bg-slate-500/20 text-slate-400',
    };
    return colors[role] || 'bg-slate-500/20 text-slate-400';
  }

  openAddDialog() {
    const ref = this.dialog.open(UserFormDialogComponent, {
      width: '500px',
      data: { user: null },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.loadUsers();
    });
  }

  openEditDialog(user: User) {
    const ref = this.dialog.open(UserFormDialogComponent, {
      width: '500px',
      data: { user },
    });
    ref.afterClosed().subscribe((result) => {
      if (result) this.loadUsers();
    });
  }

  toggleActive(user: User) {
    this.usersService
      .update(user.id, { isActive: !user.isActive } as any)
      .subscribe(() => this.loadUsers());
  }
}
