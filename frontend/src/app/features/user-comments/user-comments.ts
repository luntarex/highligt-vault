import { User } from './../../core/models/user';
import { Component, OnInit } from '@angular/core';
import { BackLink } from '../../shared/back-link/back-link';
import { CommentService } from '../../core/services/comment.service';
import { ActivatedRoute } from '@angular/router';
import { Comment } from '../../core/models/comment';
import { UserService } from '../../core/services/user.service';

@Component({
  selector: 'app-user-comments',
  imports: [BackLink],
  templateUrl: './user-comments.html',
  styleUrl: './user-comments.css',
})
export class UserComments implements OnInit {
  comments: Comment[] = [];
  userId!: number;
  user : User|null = null;

  constructor(private commentService: CommentService, private route: ActivatedRoute, private userService: UserService) {}

  ngOnInit(): void {
    const idParam = this.route.snapshot.paramMap.get('userId');
    this.userId = idParam ? Number(idParam) : 0;

    this.commentService.getCommentsByUserId(this.userId).subscribe((comments) => {
      this.comments = comments;
    });

    this.userService.getUserById(this.userId).subscribe((user) => {
      this.user = user;
    });
  }
}

