import { Injectable } from '@angular/core';
import { Observable, of } from 'rxjs';
import { TrackingItem, AuditLog, ComparisonJob } from '../models/types.model';
import { MOCK_TRACKING_DATA, MOCK_LOGS, MOCK_COMPARISON_JOBS } from '../../../mock-data/tracking.mock';

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  private trackingItems: TrackingItem[] = [...MOCK_TRACKING_DATA];
  private auditLogs: AuditLog[] = [...MOCK_LOGS];
  private comparisonJobs: ComparisonJob[] = [...MOCK_COMPARISON_JOBS];

  getTrackingItems(): Observable<TrackingItem[]> {
    return of(this.trackingItems);
  }

  addTrackingItem(item: TrackingItem): Observable<TrackingItem> {
    this.trackingItems.unshift(item);
    return of(item);
  }

  getAuditLogs(): Observable<AuditLog[]> {
    return of(this.auditLogs);
  }

  addAuditLog(action: string, user: string, details: string): Observable<AuditLog> {
    const newLog: AuditLog = {
      id: `log-${Date.now()}`,
      action,
      user,
      timestamp: new Date().toISOString(),
      details
    };
    this.auditLogs.unshift(newLog);
    return of(newLog);
  }

  getComparisonJobs(): Observable<ComparisonJob[]> {
    return of(this.comparisonJobs);
  }

  updateComparisonJob(jobId: string, updates: Partial<ComparisonJob>): Observable<ComparisonJob> {
    const idx = this.comparisonJobs.findIndex(j => j.id === jobId);
    if (idx !== -1) {
      this.comparisonJobs[idx] = {
        ...this.comparisonJobs[idx],
        ...updates
      };
      return of(this.comparisonJobs[idx]);
    }
    throw new Error(`Comparison Job with ID ${jobId} not found`);
  }
}
