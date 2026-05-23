import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { Observable } from 'rxjs';

export interface ImageUploadResponse {
  secureUrl: string;
  publicId?: string;
  bytes?: number;
  format?: string;
}

@Injectable({
  providedIn: 'root'
})
export class UploadService {
  private apiUrl = `${API_BASE_URL}/uploads`;

  constructor(private http: HttpClient) {}

  uploadImage(file: File): Observable<ImageUploadResponse> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<ImageUploadResponse>(`${this.apiUrl}/images`, formData);
  }
}

