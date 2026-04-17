import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';
import { Message, Conversation } from '../models/message.model';

@Injectable({
  providedIn: 'root'
})
export class MessageService {
  private apiUrl = 'http://localhost:8080/api/messages';

  constructor(private http: HttpClient) { }

  getConversations(userId: number): Observable<Conversation[]> {
    return this.http.get<Conversation[]>(`${this.apiUrl}/conversations?userId=${userId}`);
  }

  getConversation(currentUserId: number, otherUserId: number): Observable<Message[]> {
    return this.http.get<Message[]>(`${this.apiUrl}/${otherUserId}?currentUserId=${currentUserId}`);
  }

  sendMessage(senderId: number, receiverId: number, content: string): Observable<any> {
    return this.http.post(this.apiUrl, { senderId, receiverId, content });
  }

  markAsRead(messageId: number): Observable<any> {
    return this.http.put(`${this.apiUrl}/${messageId}/read`, {});
  }

  deleteConversation(userId1: number, userId2: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/conversation?userId1=${userId1}&userId2=${userId2}`);
  }

  deleteMessage(messageId: number): Observable<any> {
    return this.http.delete(`${this.apiUrl}/${messageId}`);
  }

  deleteMessages(ids: number[]): Observable<any> {
    return this.http.delete(`${this.apiUrl}/batch?ids=${ids.join(',')}`);
  }
}
