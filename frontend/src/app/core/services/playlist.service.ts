import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Playlist } from '../models/playlist';

@Injectable({
  providedIn: 'root'
})
export class PlaylistService {

  private apiUrl = 'http://localhost:8080/api/playlists';

  constructor(private http: HttpClient) { }

  getUserPlaylists(userId: number): Observable<Playlist[]> {
    return this.http.get<Playlist[]>(`${this.apiUrl}/user/${userId}`);
  }

  getPlaylist(playlistId: number): Observable<Playlist> {
    return this.http.get<Playlist>(`${this.apiUrl}/${playlistId}`);
  }

  createPlaylist(userId: number, name: string, description: string = ''): Observable<{message: string, id: number}> {
    return this.http.post<{message: string, id: number}>(this.apiUrl, { userId, name, description });
  }

  updatePlaylist(playlistId: number, name: string, description: string = ''): Observable<{message: string}> {
    return this.http.put<{message: string}>(`${this.apiUrl}/${playlistId}`, { name, description });
  }

  deletePlaylist(playlistId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${playlistId}`);
  }

  addClipToPlaylist(playlistId: number, clipId: number): Observable<{message: string}> {
    return this.http.post<{message: string}>(`${this.apiUrl}/${playlistId}/clips/${clipId}`, {});
  }

  removeClipFromPlaylist(playlistId: number, clipId: number): Observable<{message: string}> {
    return this.http.delete<{message: string}>(`${this.apiUrl}/${playlistId}/clips/${clipId}`);
  }
}
