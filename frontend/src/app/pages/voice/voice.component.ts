import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { MatIconModule } from '@angular/material/icon';
import { VoiceService, VoiceAgentStatus, VoiceCall, VoiceMetrics, VoiceQueue } from '../../core/services/voice.service';

@Component({
  selector: 'app-voice',
  standalone: true,
  imports: [CommonModule, FormsModule, MatIconModule],
  templateUrl: './voice.component.html',
})
export class VoiceComponent implements OnInit {
  loading = true;
  statusSaving = false;
  outboundLoading = false;
  queueSaving = false;
  agentStatus: VoiceAgentStatus = 'offline';
  queues: VoiceQueue[] = [];
  calls: VoiceCall[] = [];
  metrics: VoiceMetrics | null = null;
  queueName = '';
  outboundTo = '';
  filters = {
    status: '',
    direction: '',
  };

  constructor(private readonly voiceService: VoiceService) {}

  ngOnInit(): void {
    this.reloadAll();
  }

  reloadAll() {
    this.loading = true;
    this.voiceService.listAgentStatuses().subscribe({
      next: (statuses) => {
        const mine = statuses[0];
        this.agentStatus = mine?.status || 'offline';
      },
      error: () => {},
    });

    this.voiceService.listQueues().subscribe({
      next: (queues) => (this.queues = queues),
      error: () => {},
    });

    this.refreshCalls();
    this.voiceService.getMetrics().subscribe({
      next: (metrics) => {
        this.metrics = metrics;
        this.loading = false;
      },
      error: () => {
        this.loading = false;
      },
    });
  }

  changeStatus(status: VoiceAgentStatus) {
    if (this.statusSaving) return;
    this.statusSaving = true;
    this.voiceService.setAgentStatus(status).subscribe({
      next: () => {
        this.agentStatus = status;
        this.statusSaving = false;
      },
      error: () => {
        this.statusSaving = false;
      },
    });
  }

  addQueue() {
    const name = this.queueName.trim();
    if (!name || this.queueSaving) return;
    this.queueSaving = true;
    this.voiceService.createQueue({ name }).subscribe({
      next: () => {
        this.queueName = '';
        this.queueSaving = false;
        this.voiceService.listQueues().subscribe((queues) => (this.queues = queues));
      },
      error: () => {
        this.queueSaving = false;
      },
    });
  }

  makeOutboundCall() {
    const toNumber = this.outboundTo.trim();
    if (!toNumber || this.outboundLoading) return;
    this.outboundLoading = true;
    this.voiceService.createOutboundCall({ toNumber }).subscribe({
      next: () => {
        this.outboundTo = '';
        this.outboundLoading = false;
        this.refreshCalls();
        this.voiceService.getMetrics().subscribe((metrics) => (this.metrics = metrics));
      },
      error: () => {
        this.outboundLoading = false;
      },
    });
  }

  refreshCalls() {
    this.voiceService.listCalls(this.filters).subscribe({
      next: (calls) => (this.calls = calls),
      error: () => (this.calls = []),
    });
  }
}
