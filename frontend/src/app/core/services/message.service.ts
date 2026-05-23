import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { API_BASE_URL } from '../config/api.config';
import { Observable } from 'rxjs';
import { Message, Conversation } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = `${API_BASE_URL}/messages`;

  constructor(private http: HttpClient) { }

  getConversations(userId: number): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/conversations`);
  }

  getConversation(currentUserId: number, otherUserId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/${otherUserId}`);
  }

  sendMessage(senderId: number, receiverId: number, content: string): Observable<Message> {
    return this.http.post<Message>(this.apiUrl, { senderId, receiverId, content });
  }

  sendPost(receiverId: number, postId: string | number, content: string = 'Shared a post'): Observable<any> {
    return this.http.post(this.apiUrl, { receiverId, content, sharedPostId: Number(postId) });
  }

  markAsRead(messageId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${messageId}/read`, {});
  }

  deleteConversation(userId1: number, userId2: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/conversation?userId2=${userId2}`);
  }

  deleteMessage(messageId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${messageId}`);
  }

  deleteMessages(ids: number[]): Observable<any> {
    return this.http.delete(`${this.apiUrl}/batch?ids=${ids.join(',')}`);
  }
}

