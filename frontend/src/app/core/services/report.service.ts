import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';

export type ReportTargetType = 'CLIP' | 'POST' | 'COMMENT' | 'USER';

export type ReportReason =
  | 'SEXUAL_CONTENT'
  | 'VIOLENCE'
  | 'HATE'
  | 'HARASSMENT'
  | 'SPAM'
  | 'COPYRIGHT'
  | 'PERSONAL_INFO'
  | 'OTHER';

export interface CreateReportRequest {
  targetType: ReportTargetType;
  targetId: number;
  reason: ReportReason;
  details?: string;
}

export interface ReportedClipPreview {
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

export interface ReportedCommentPreview {
  id: number;
  content: string;
  createdAt: string;
  userId: number;
  postId: number;
  parentCommentId?: number;
  username: string;
  profilePhoto?: string;
}

export interface ReportResponse {
  id: number;
  reporterId: number;
  targetType: ReportTargetType;
  targetId: number;
  reason: ReportReason;
  details?: string;
  status: 'OPEN' | 'IN_REVIEW' | 'RESOLVED' | 'DISMISSED';
  createdAt: string;
  reviewedBy?: number;
  reviewedAt?: string;
  resolution?: string;
  reporterUsername?: string;
  targetPostId?: number;
  targetClip?: ReportedClipPreview;
  targetComment?: ReportedCommentPreview;
}

@Injectable({
  providedIn: 'root'
})
export class ReportService {
  private apiUrl = `${API_BASE_URL}/reports`;

  constructor(private http: HttpClient) {}

  createReport(request: CreateReportRequest): Observable<{ message: string; id: number }> {
    return this.http.post<{ message: string; id: number }>(this.apiUrl, request);
  }

  getMyReports(): Observable<ReportResponse[]> {
    return this.http.get<ReportResponse[]>(`${this.apiUrl}/my`);
  }
}
