import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';

export type SocialPlatform = 'meta' | 'instagram' | 'tiktok' | 'linkedin' | 'x';
export type SocialPostStatus = 'draft' | 'scheduled' | 'published' | 'failed';

export interface SocialAccount {
  id: string;
  platform: SocialPlatform;
  handle: string;
  displayName?: string | null;
  status: string;
  metadata: Record<string, any>;
  createdAt: string;
}

export interface SocialPost {
  id: string;
  content: string;
  channels: SocialPlatform[];
  status: SocialPostStatus;
  scheduledAt?: string | null;
  publishedAt?: string | null;
  error?: string | null;
  createdAt: string;
}

export interface SocialPostLog {
  id: string;
  level: string;
  message: string;
  payload: Record<string, any>;
  createdAt: string;
}

export interface SocialPostDetail extends SocialPost {
  logs: SocialPostLog[];
}

@Injectable({ providedIn: 'root' })
export class SocialPlannerService {
  private baseUrl = `${environment.apiUrl}/social-planner`;

  constructor(private http: HttpClient) {}

  listAccounts() {
    return this.http.get<SocialAccount[]>(`${this.baseUrl}/accounts`);
  }

  createAccount(data: Partial<SocialAccount>) {
    return this.http.post<SocialAccount>(`${this.baseUrl}/accounts`, data);
  }

  updateAccount(id: string, data: Partial<SocialAccount>) {
    return this.http.patch<SocialAccount>(`${this.baseUrl}/accounts/${id}`, data);
  }

  deleteAccount(id: string) {
    return this.http.delete<{ ok: boolean }>(`${this.baseUrl}/accounts/${id}`);
  }

  listPosts() {
    return this.http.get<SocialPost[]>(`${this.baseUrl}/posts`);
  }

  getPost(id: string) {
    return this.http.get<SocialPostDetail>(`${this.baseUrl}/posts/${id}`);
  }

  createPost(data: Partial<SocialPost>) {
    return this.http.post<SocialPost>(`${this.baseUrl}/posts`, data);
  }

  updatePost(id: string, data: Partial<SocialPost>) {
    return this.http.patch<SocialPost>(`${this.baseUrl}/posts/${id}`, data);
  }

  calendar(start: string, end: string) {
    return this.http.get<SocialPost[]>(`${this.baseUrl}/calendar`, { params: { start, end } });
  }

  metrics(start: string, end: string) {
    return this.http.get<{ scheduled: number; published: number; failed: number; total: number }>(
      `${this.baseUrl}/metrics`,
      { params: { start, end } },
    );
  }
}
