import { Injectable, signal, computed } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Router } from '@angular/router';
import { tap } from 'rxjs';
import { environment } from '../../../environments/environment';

interface LoginResponse {
  access_token?: string;
  mfaRequired?: boolean;
  mfaEnabled?: boolean;
  mfaMethod?: 'authenticator' | 'email';
  tempToken?: string;
}

interface RegisterResponse {
  access_token: string;
  tenant: { id: string; name: string; slug: string };
}

interface TokenPayload {
  sub: string;
  email: string;
  tenantId: string | null;
  role: string;
  exp: number;
}

@Injectable({ providedIn: 'root' })
export class AuthService {
  private tokenSignal = signal<string | null>(localStorage.getItem('token'));

  isAuthenticated = computed(() => {
    const token = this.tokenSignal();
    if (!token) return false;
    const payload = this.decodeToken(token);
    return payload ? payload.exp * 1000 > Date.now() : false;
  });

  currentUser = computed(() => {
    const token = this.tokenSignal();
    return token ? this.decodeToken(token) : null;
  });

  constructor(private http: HttpClient, private router: Router) {}

  login(email: string, password: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/login`, { email, password })
      .pipe(tap((res) => {
        if (res.access_token) this.setToken(res.access_token);
      }));
  }

  verifyMfa(tempToken: string, code: string) {
    return this.http
      .post<LoginResponse>(`${environment.apiUrl}/auth/mfa/verify`, { tempToken, code })
      .pipe(tap((res) => {
        if (res.access_token) this.setToken(res.access_token);
      }));
  }

  setupMfaInit(tempToken: string, method: 'authenticator' | 'email') {
    return this.http.post<any>(`${environment.apiUrl}/auth/mfa/setup-init`, { tempToken, method });
  }

  setupMfaConfirm(tempToken: string, code: string) {
    return this.http.post<LoginResponse>(`${environment.apiUrl}/auth/mfa/setup-confirm`, { tempToken, code })
      .pipe(tap((res) => {
        if (res.access_token) this.setToken(res.access_token);
      }));
  }

  resendMfaCode(tempToken: string) {
    return this.http.post<void>(`${environment.apiUrl}/auth/mfa/resend`, { tempToken });
  }

  register(data: {
    companyName: string;
    companySlug: string;
    firstName: string;
    lastName: string;
    email: string;
    password: string;
  }) {
    return this.http
      .post<RegisterResponse>(`${environment.apiUrl}/auth/register`, data)
      .pipe(tap((res) => this.setToken(res.access_token)));
  }

  logout() {
    localStorage.removeItem('token');
    this.tokenSignal.set(null);
    this.router.navigate(['/login']);
  }

  getToken(): string | null {
    return this.tokenSignal();
  }

  private setToken(token: string) {
    localStorage.setItem('token', token);
    this.tokenSignal.set(token);
  }

  private decodeToken(token: string): TokenPayload | null {
    try {
      const payload = token.split('.')[1];
      return JSON.parse(atob(payload));
    } catch {
      return null;
    }
  }
}
