import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Clip } from '../models/clip';

export interface VideoUploadResponse {
  secureUrl: string;
  publicId: string;
  thumbnailUrl: string;
  duration?: number;
  bytes?: number;
  format?: string;
}

export interface AddClipResponse {
  message: string;
  clipId: number;
}

export interface ClipModerationResponse {
  moderationStatus: 'DRAFT' | 'PENDING_REVIEW' | 'AUTO_APPROVED' | 'NEEDS_MANUAL_REVIEW' | 'APPROVED' | 'REJECTED' | 'REMOVED' | 'APPEALED';
  visibilityStatus: 'PRIVATE' | 'PUBLIC' | 'LIMITED' | 'HIDDEN' | 'REMOVED';
  score: number;
  flagged: boolean;
  category: string;
  reason: string;
}

@Injectable({
  providedIn: 'root'
})
export class ClipService {

  private apiUrl = 'http://localhost:8080/api/clips';
  private uploadApiUrl = 'http://localhost:8080/api/uploads';

  constructor(private http: HttpClient) { }

  getClips(uploaderId?: number): Observable<Clip[]> {
    let url = this.apiUrl;
    if (uploaderId) {
      url += `?uploaderId=${uploaderId}`;
    }
    return this.http.get<Clip[]>(url);
  }

  getClip(id: number): Observable<Clip> {
    return this.http.get<Clip>(`${this.apiUrl}/${id}`);
  }
  
  getClipsCommentedByUser(userId: number): Observable<Clip[]> {
    return this.http.get<Clip[]>(`${this.apiUrl}/commented-by/${userId}`);
  }

  addClip(clip: Clip): Observable<AddClipResponse> {
    return this.http.post<AddClipResponse>(this.apiUrl, clip);
  }

  scanClipAfterUpload(clipId: number): Observable<ClipModerationResponse> {
    return this.http.post<ClipModerationResponse>(`${this.apiUrl}/scan/${clipId}`, {});
  }

  uploadVideo(file: File): Observable<VideoUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<VideoUploadResponse>(`${this.uploadApiUrl}/videos`, formData);
  }

  deleteClip(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${id}`);
  }

  hardDeleteClip(id: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/trash/${id}/hard`);
  }

  updateClip(updatedClip: Clip): Observable<any> {
    return this.http.put(`${this.apiUrl}/${updatedClip.id}`, updatedClip);
  }

  getDeletedClips(uploaderId: number): Observable<Clip[]> {
    return this.http.get<Clip[]>(`${this.apiUrl}/trash?uploaderId=${uploaderId}`);
  }

  recoverClip(id: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/trash/recover/${id}`, {});
  }

  appealClip(id: number, reason: string): Observable<any> {
    return this.http.post(`${this.apiUrl}/${id}/appeal`, { reason });
  }

  getFavorites(userId: number): Observable<Clip[]> {
    return this.http.get<Clip[]>(`${this.apiUrl}/favorites/${userId}`);
  }

  removeFavorite(clipId: number, userId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${clipId}/favorite?userId=${userId}`);
  }

  formatDuration(seconds: number): string {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}
