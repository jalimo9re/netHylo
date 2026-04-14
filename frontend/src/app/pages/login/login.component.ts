import { Component } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { Router } from '@angular/router';
import { MatCardModule } from '@angular/material/card';
import { MatInputModule } from '@angular/material/input';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { AuthService } from '../../core/services/auth.service';

@Component({
  selector: 'app-login',
  standalone: true,
  imports: [
    CommonModule,
    FormsModule,
    MatCardModule,
    MatInputModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
  ],
  templateUrl: './login.component.html',
})
export class LoginComponent {
  email = '';
  password = '';
  error = '';
  loading = false;
  
  // MFA States
  mfaRequired = false;
  mfaEnabled = false;
  mfaMethod: 'authenticator' | 'email' | null = null;
  tempToken = '';
  mfaCode = '';
  qrCodeUrl = '';
  setupMethod: 'authenticator' | 'email' | null = null;
  step: 'LOGIN' | 'MFA_VERIFY' | 'MFA_SETUP' | 'MFA_CHOOSE' = 'LOGIN';

  constructor(private authService: AuthService, private router: Router) {}

  onSubmit() {
    this.loading = true;
    this.error = '';
    this.authService.login(this.email, this.password).subscribe({
      next: (res) => {
        if (res.mfaRequired) {
          this.tempToken = res.tempToken || '';
          this.mfaEnabled = res.mfaEnabled || false;
          this.mfaMethod = res.mfaMethod || null;
          
          if (this.mfaEnabled) {
            this.step = 'MFA_VERIFY';
          } else {
            this.step = 'MFA_CHOOSE';
          }
          this.loading = false;
        } else {
          this.router.navigate(['/dashboard']);
        }
      },
      error: (err) => {
        this.error = err.error?.message || 'Credenciales inválidas';
        this.loading = false;
      },
    });
  }

  onVerifyMfa() {
    this.loading = true;
    this.error = '';
    this.authService.verifyMfa(this.tempToken, this.mfaCode).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Código inválido';
        this.loading = false;
      }
    });
  }

  onChooseSetup(method: 'authenticator' | 'email') {
    this.loading = true;
    this.setupMethod = method;
    this.authService.setupMfaInit(this.tempToken, method).subscribe({
      next: (res) => {
        if (method === 'authenticator') {
          this.qrCodeUrl = res.qrCode;
        }
        this.step = 'MFA_SETUP';
        this.loading = false;
      },
      error: (err) => {
        this.error = err.error?.message || 'Error al iniciar configuración';
        this.loading = false;
      }
    });
  }

  onConfirmSetup() {
    this.loading = true;
    this.error = '';
    this.authService.setupMfaConfirm(this.tempToken, this.mfaCode).subscribe({
      next: () => {
        this.router.navigate(['/dashboard']);
      },
      error: (err) => {
        this.error = err.error?.message || 'Código inválido';
        this.loading = false;
      }
    });
  }

  resendCode() {
    this.authService.resendMfaCode(this.tempToken).subscribe();
  }
}
