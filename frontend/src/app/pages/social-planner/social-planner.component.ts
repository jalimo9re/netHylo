import { CommonModule } from '@angular/common';
import { Component, OnInit } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import {
  SocialAccount,
  SocialPlatform,
  SocialPlannerService,
  SocialPost,
  SocialPostDetail,
  SocialPostStatus,
} from '../../core/services/social-planner.service';

@Component({
  selector: 'app-social-planner',
  standalone: true,
  imports: [CommonModule, FormsModule, MatCardModule, MatButtonModule, MatIconModule],
  templateUrl: './social-planner.component.html',
})
export class SocialPlannerComponent implements OnInit {
  channels: SocialPlatform[] = ['meta', 'instagram', 'tiktok', 'linkedin', 'x'];
  accounts: SocialAccount[] = [];
  posts: SocialPost[] = [];
  selectedPost: SocialPostDetail | null = null;
  calendarByDay: Array<{ day: string; items: SocialPost[] }> = [];
  metrics = { scheduled: 0, published: 0, failed: 0, total: 0 };
  loading = false;

  accountForm: Partial<SocialAccount> = {
    platform: 'meta',
    handle: '',
    displayName: '',
    status: 'connected',
  };
  editingAccountId: string | null = null;

  postForm: { content: string; channels: SocialPlatform[]; scheduledAt: string; status: SocialPostStatus } =
    {
      content: '',
      channels: ['meta'],
      scheduledAt: '',
      status: 'draft',
    };

  constructor(private socialPlannerService: SocialPlannerService) {}

  ngOnInit(): void {
    this.refreshAll();
  }

  refreshAll() {
    this.loading = true;
    this.socialPlannerService.listAccounts().subscribe((data) => (this.accounts = data));
    this.socialPlannerService.listPosts().subscribe((data) => (this.posts = data));
    const { start, end } = this.currentMonthRange();
    this.socialPlannerService.calendar(start, end).subscribe((items) => {
      this.calendarByDay = this.groupByDay(items);
    });
    this.socialPlannerService.metrics(start, end).subscribe((data) => {
      this.metrics = data;
      this.loading = false;
    });
  }

  saveAccount() {
    if (!this.accountForm.platform || !this.accountForm.handle?.trim()) return;
    const request = this.editingAccountId
      ? this.socialPlannerService.updateAccount(this.editingAccountId, this.accountForm)
      : this.socialPlannerService.createAccount(this.accountForm);
    request.subscribe(() => {
      this.accountForm = { platform: 'meta', handle: '', displayName: '', status: 'connected' };
      this.editingAccountId = null;
      this.refreshAll();
    });
  }

  editAccount(account: SocialAccount) {
    this.editingAccountId = account.id;
    this.accountForm = {
      platform: account.platform,
      handle: account.handle,
      displayName: account.displayName || '',
      status: account.status,
    };
  }

  removeAccount(account: SocialAccount) {
    this.socialPlannerService.deleteAccount(account.id).subscribe(() => this.refreshAll());
  }

  toggleChannel(channel: SocialPlatform) {
    if (this.postForm.channels.includes(channel)) {
      this.postForm.channels = this.postForm.channels.filter((item) => item !== channel);
      if (this.postForm.channels.length === 0) this.postForm.channels = [channel];
      return;
    }
    this.postForm.channels = [...this.postForm.channels, channel];
  }

  savePost() {
    if (!this.postForm.content.trim()) return;
    const payload = {
      content: this.postForm.content,
      channels: this.postForm.channels,
      status: this.postForm.scheduledAt ? 'scheduled' : this.postForm.status,
      scheduledAt: this.postForm.scheduledAt || undefined,
    };
    this.socialPlannerService.createPost(payload).subscribe(() => {
      this.postForm = { content: '', channels: ['meta'], scheduledAt: '', status: 'draft' };
      this.refreshAll();
    });
  }

  openPost(post: SocialPost) {
    this.socialPlannerService.getPost(post.id).subscribe((data) => (this.selectedPost = data));
  }

  statusClass(status: SocialPostStatus) {
    if (status === 'published') return 'text-green-400';
    if (status === 'failed') return 'text-red-400';
    if (status === 'scheduled') return 'text-amber-300';
    return 'text-slate-300';
  }

  private currentMonthRange() {
    const now = new Date();
    const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1, 0, 0, 0));
    const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() + 1, 0, 23, 59, 59));
    return { start: start.toISOString(), end: end.toISOString() };
  }

  private groupByDay(posts: SocialPost[]) {
    const map = new Map<string, SocialPost[]>();
    for (const post of posts) {
      const date = post.scheduledAt || post.createdAt;
      const day = new Date(date).toISOString().slice(0, 10);
      const current = map.get(day) || [];
      current.push(post);
      map.set(day, current);
    }
    return Array.from(map.entries())
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([day, items]) => ({ day, items }));
  }
}
