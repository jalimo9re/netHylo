import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { MobileNotification, MobileService } from '../../core/services/mobile.service';

@Component({
  selector: 'app-mobile',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './mobile.component.html',
})
export class MobileComponent implements OnInit {
  registering = false;
  sending = false;
  loading = false;
  notifications: MobileNotification[] = [];

  registerForm = {
    token: '',
    platform: 'android' as 'ios' | 'android' | 'web',
    appVersion: '0.1.0',
  };

  mockForm = {
    type: 'manual.test',
    title: 'Push test',
    body: 'Notificación de prueba enviada desde admin',
  };

  constructor(private mobileService: MobileService) {}

  ngOnInit() {
    this.reloadNotifications();
  }

  reloadNotifications() {
    this.loading = true;
    this.mobileService.listNotifications(40).subscribe({
      next: (notifications) => {
        this.notifications = notifications;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  registerDevice() {
    if (!this.registerForm.token.trim()) return;
    this.registering = true;
    this.mobileService.registerDevice(this.registerForm).subscribe({
      next: () => {
        this.registering = false;
      },
      error: () => {
        this.registering = false;
      },
    });
  }

  sendMock() {
    if (!this.mockForm.title.trim() || !this.mockForm.body.trim()) return;
    this.sending = true;
    this.mobileService.sendMock(this.mockForm).subscribe({
      next: () => {
        this.sending = false;
        this.reloadNotifications();
      },
      error: () => {
        this.sending = false;
      },
    });
  }

  markRead(notification: MobileNotification) {
    this.mobileService.markRead(notification.id).subscribe({
      next: () => {
        notification.isRead = true;
      },
    });
  }
}
