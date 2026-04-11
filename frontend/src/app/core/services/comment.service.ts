import { Observable, of } from 'rxjs';
import { Injectable } from '@angular/core';
import { Comment } from '../models/comment';

@Injectable({
  providedIn: 'root'
})
export class CommentService {

  private mockComments: Comment[] = [
    {
      id: 1,
      postId: 'p1',
      userId: 2,
      content: 'Bro that flick at the end was insane 🔥',
      timeAgo: '1h'
    },
    {
      id: 2,
      postId: 'p1',
      userId: 3,
      content: 'What sensitivity do you play on?',
      timeAgo: '3h'
    },
    {
      id: 3,
      postId: 'p1',
      userId: 4,
      content: 'I tried this lineup and died instantly lol',
      timeAgo: '5h'
    },
    {
      id: 4,
      postId: 'p2',
      userId: 1,
      content: 'That baron steal was legendary!',
      timeAgo: '2h'
    },
    {
      id: 5,
      postId: 'p2',
      userId: 3,
      content: 'Lee Sin mechanics on point 👌',
      timeAgo: '4h'
    },
    {
      id: 6,
      postId: 'p1',
      parentCommentId: 1,
      userId: 1,
      content: 'Right?! The crosshair placement was perfect',
      timeAgo: '45m'
    },
    {
      id: 7,
      postId: 'p3',
      userId: 2,
      content: 'Clean rotation, well played!',
      timeAgo: '1d'
    },
    {
      id: 8,
      postId: 'p3',
      userId: 5,
      content: 'This is why I love this game',
      timeAgo: '6h'
    },
    {
      id: 9,
      postId: 'p4',
      userId: 4,
      content: 'The smoke placement was perfect timing',
      timeAgo: '3h'
    },
    {
      id: 10,
      postId: 'p2',
      parentCommentId: 4,
      userId: 2,
      content: 'Thanks! Been practicing that combo for weeks',
      timeAgo: '1h'
    }
  ];

  private nextId = 11;

  getCommentsByPostId(postId: string): Observable<Comment[]> {
    return of(this.mockComments.filter(c => c.postId === postId && !c.isRemoved));
  }

  getCommentsByUserId(userId: number): Observable<Comment[]> {
    return of(this.mockComments.filter(c => c.userId === userId && !c.isRemoved));
  }

  getPostIdsCommentedByUser(userId: number): string[] {
    const postIds = this.mockComments
      .filter(c => c.userId === userId && !c.isRemoved)
      .map(c => c.postId);
    return [...new Set(postIds)];
  }

  getCommentCountByPostId(postId: string): number {
    return this.mockComments.filter(c => c.postId === postId && !c.isRemoved).length;
  }

  addComment(postId: string, userId: number, content: string, parentCommentId?: number): Comment {
    const comment: Comment = {
      id: this.nextId++,
      postId,
      userId,
      content,
      timeAgo: 'Just now',
      parentCommentId
    };
    this.mockComments.unshift(comment);
    return comment;
  }

  updateComment(id: number, newText: string): void {
    const comment = this.mockComments.find(c => c.id === id);
    if (comment) {
      comment.content = newText;
    }
  }

  removeComment(id: number): void {
    const comment = this.mockComments.find(c => c.id === id);
    if (comment) {
      comment.isRemoved = true;
    }
  }
}
