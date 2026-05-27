import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { API_BASE_URL } from '../config/api.config';
import { ClipGroup } from '../models/clip-group';

@Injectable({
  providedIn: 'root'
})
export class ClipGroupService {
  private apiUrl = `${API_BASE_URL}/clip-groups`;

  constructor(private http: HttpClient) {}

  getUserGroups(userId: number, type?: string): Observable<ClipGroup[]> {
    const suffix = type ? `?type=${encodeURIComponent(type)}` : '';
    return this.http.get<ClipGroup[]>(`${this.apiUrl}/user/${userId}${suffix}`);
  }

  getGroup(groupId: number): Observable<ClipGroup> {
    return this.http.get<ClipGroup>(`${this.apiUrl}/${groupId}`);
  }

  createGroup(name: string, description: string = '', clipIds: number[] = [], type = 'LIBRARY'): Observable<{ message: string; id: number }> {
    return this.http.post<{ message: string; id: number }>(this.apiUrl, { name, description, clipIds, type });
  }

  addClipsToGroup(groupId: number, clipIds: number[]): Observable<{ message: string }> {
    return this.http.post<{ message: string }>(`${this.apiUrl}/${groupId}/clips`, { clipIds });
  }

  removeClipFromGroup(groupId: number, clipId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${groupId}/clips/${clipId}`);
  }

  deleteGroup(groupId: number): Observable<{ message: string }> {
    return this.http.delete<{ message: string }>(`${this.apiUrl}/${groupId}`);
  }
}
