import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { ClipGroup } from '../models/clip-group';

@Injectable({
  providedIn: 'root'
})
export class ClipGroupService {

  private apiUrl = 'http://localhost:8080/api/clipGroups';

  constructor(private http: HttpClient) { }

  getUserGroups(userId: number, type?: string): Observable<ClipGroup[]> {
    const url = type ? `${this.apiUrl}/user/${userId}?type=${type}` : `${this.apiUrl}/user/${userId}`;
    return this.http.get<ClipGroup[]>(url);
  }

  getGroup(groupId: number): Observable<ClipGroup> {
    return this.http.get<ClipGroup>(`${this.apiUrl}/${groupId}`);
  }

  createGroup(userId: number, name: string, description: string = '', type: string = 'LIBRARY'): Observable<{message: string, id: number}> {
    return this.http.post<{message: string, id: number}>(this.apiUrl, { userId, name, description, type });
  }

  updateGroup(groupId: number, name: string, description: string = ''): Observable<{message: string}> {
    return this.http.put<{message: string}>(`${this.apiUrl}/${groupId}`, { name, description });
  }

  deleteGroup(groupId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${groupId}`);
  }

  addClipToGroup(groupId: number, clipId: number): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/${groupId}/clips/${clipId}`, {});
  }

  removeClipFromGroup(groupId: number, clipId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${groupId}/clips/${clipId}`);
  }
}
