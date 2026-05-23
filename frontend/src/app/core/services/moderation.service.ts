import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { Observable } from 'rxjs';
import { timeout } from 'rxjs/operators';

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
}

