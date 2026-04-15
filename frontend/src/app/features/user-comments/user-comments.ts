import { User } from './../../core/models/user';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { BackLink } from '../../shared/back-link/back-link';
import { CommentService } from '../../core/services/comment.service';
import { ActivatedRoute } from '@angular/router';
import { Comment } from '../../core/models/comment';
import { UserService } from '../../core/services/user.service';
import { AuthService } from '../../core/services/auth.service';
import { CommonModule } from '@angular/common';
import { ToastService } from '../../core/services/toast.service';

@Component({
  selector: 'app-user-comments',
  imports: [BackLink, CommonModule],
  templateUrl: './user-comments.html',
  styleUrl: './user-comments.css',
})
export class UserComments implements OnInit {
  comments: Comment[] = [];
  userId!: number;
  user : User|null = null;
  isAdmin: boolean = false;
  showModerateModal: boolean = false;
  commentToModerate: Comment | null = null;
  tosViolationText: string = '[This comment is deleted by an admin because of a TOS violation]';

  constructor(
    private commentService: CommentService, 
    private route: ActivatedRoute, 
    private userService: UserService, 
    private authService: AuthService,
    private toast: ToastService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('userId');
    this.userId = idParam ? Number(idParam) : 0;

    this.commentService.getCommentsByUserId(this.userId).subscribe((comments) => {
      this.comments = comments;
      this.cdr.detectChanges();
    });

    this.userService.getUserById(this.userId).subscribe((user) => {
      this.user = user;
      this.cdr.detectChanges();
    });

    this.isAdmin = this.authService.isAdmin();
  }

  isTosViolation(content: string): boolean {
    return content === this.tosViolationText;
  }

  openModerateModal(comment: Comment): void {
    this.commentToModerate = comment;
    this.showModerateModal = true;
    this.cdr.detectChanges();
  }

  closeModerateModal(): void {
    this.showModerateModal = false;
    this.commentToModerate = null;
    this.cdr.detectChanges();
  }

  moderateDelete(): void {
    if (!this.commentToModerate) return;
    this.commentService.removeComment(this.commentToModerate.id).subscribe({
      next: () => {
        this.comments = this.comments.filter(c => c.id !== this.commentToModerate?.id);
        this.toast.success('Comment deleted successfully.');
        this.closeModerateModal();
      },
      error: () => this.toast.error('Failed to delete comment.')
    });
  }

  moderateTosViolation(): void {
    if (!this.commentToModerate) return;
    this.commentService.updateComment(this.commentToModerate.id, this.tosViolationText).subscribe({
      next: () => {
        const comment = this.comments.find(c => c.id === this.commentToModerate?.id);
        if (comment) comment.content = this.tosViolationText;
        this.toast.success('Comment marked as TOS violation.');
        this.closeModerateModal();
      },
      error: () => this.toast.error('Failed to update comment.')
    });
  }
}

