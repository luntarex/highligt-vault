import { Injectable } from '@angular/core';
import { HttpClient, HttpParams } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';
import { ReportResponse } from './report.service';
import { Community } from '../models/community';

export interface ModerationQueueItem {
  clipId: number;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  uploaderId: number;
  uploaderUsername: string;
  moderationStatus: string;
  moderationScore: number;
  moderationReason: string;
  moderationCategory: string;
  visibilityStatus: string;
  createdAt: string;
}

export interface ModerationQueueFilters {
  status?: string;
  minScore?: number | null;
  category?: string;
  fromDate?: string;
  toDate?: string;
}

export interface ModerationDecisionRequest {
  moderatorId: number;
  action: 'APPROVE' | 'REJECT' | 'REMOVE' | 'RESTORE';
  reason: string;
}

export interface ResolveReportRequest {
  resolution?: string;
  dismissed?: boolean;
}

@Injectable({
  providedIn: 'root'
})
export class ModerationService {
  private apiUrl = `${API_BASE_URL}/moderation`;

  constructor(private http: HttpClient) {}

  getQueue(filters: ModerationQueueFilters = {}): Observable<ModerationQueueItem[]> {
    const params: Record<string, string> = {};
    if (filters.status) params['status'] = filters.status;
    if (filters.minScore !== null && filters.minScore !== undefined) params['minScore'] = String(filters.minScore);
    if (filters.category) params['category'] = filters.category;
    if (filters.fromDate) params['fromDate'] = filters.fromDate;
    if (filters.toDate) params['toDate'] = filters.toDate;

    return this.http.get<ModerationQueueItem[]>(`${this.apiUrl}/queue`, { params }).pipe(timeout(10000));
  }

  decideClip(clipId: number, request: ModerationDecisionRequest): Observable<any> {
    return this.http.post(`${this.apiUrl}/clips/${clipId}/decision`, request);
  }

  getReports(): Observable<ReportResponse[]> {
    return this.http.get<ReportResponse[]>(`${this.apiUrl}/reports`).pipe(timeout(10000));
  }

  resolveReport(reportId: number, request: ResolveReportRequest): Observable<any> {
    const params = new HttpParams()
      .set('resolution', request.resolution || '')
      .set('dismissed', String(request.dismissed ?? false));

    return this.http.post(`${this.apiUrl}/reports/${reportId}/resolve`, null, { params });
  }

  getPendingCommunities(): Observable<Community[]> {
    return this.http.get<Community[]>(`${this.apiUrl}/communities`).pipe(timeout(10000));
  }

  approveCommunity(communityId: number, reason: string): Observable<any> {
    const params = new HttpParams().set('reason', reason || 'Approved after moderator review.');
    return this.http.post(`${this.apiUrl}/communities/${communityId}/approve`, null, { params });
  }

  rejectCommunity(communityId: number, reason: string): Observable<any> {
    const params = new HttpParams().set('reason', reason || 'Rejected after moderator review.');
    return this.http.post(`${this.apiUrl}/communities/${communityId}/reject`, null, { params });
  }
}

