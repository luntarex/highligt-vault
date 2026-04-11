import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { RouterLink } from '@angular/router';
import { NgClass } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ExplorePost } from '../../../core/models/explore-post';
import { AuthService } from '../../../core/services/auth.service';
import { ExploreService } from '../../../core/services/explore.service';

@Component({
  selector: 'app-explore-post-card',
  templateUrl: './explore-post-card.html',
  styleUrls: ['./explore-post-card.css'],
  imports: [RouterLink, NgClass, FormsModule]
})
export class ExplorePostCard {
  @Input() post!: ExplorePost;
  @Input() playingPostId: string | null = null;

  isEditingTitle = false;
  editedTitle = '';

  constructor(public authService: AuthService, private exploreService: ExploreService) {}

  canEdit(): boolean {
    return this.authService.isAdmin() || this.authService.getCurrentUserId() === this.post.author.id;
  }

  startEditingTitle() {
    if (this.canEdit() && !this.isEditingTitle) {
      this.isEditingTitle = true;
      this.editedTitle = this.post.title;
    }
  }

  saveTitle() {
    if (this.isEditingTitle && this.editedTitle.trim() !== '') {
      this.post.title = this.editedTitle.trim();
      this.exploreService.updatePost(this.post);
    }
    this.isEditingTitle = false;
  }

  cancelEditingTitle() {
    this.isEditingTitle = false;
  }

  @Output() togglePlayEvent = new EventEmitter<{ post: ExplorePost; video: HTMLVideoElement }>();
  @Output() toggleLikeEvent = new EventEmitter<ExplorePost>();
  @Output() openCommentsEvent = new EventEmitter<ExplorePost>();
  @Output() deletePostEvent = new EventEmitter<ExplorePost>();
  @Output() toggleMuteEvent = new EventEmitter<{ event: MouseEvent; video: HTMLVideoElement }>();
  @Output() seekToEvent = new EventEmitter<{ event: MouseEvent; post: ExplorePost; video: HTMLVideoElement }>();
  @Output() timeUpdateEvent = new EventEmitter<{ post: ExplorePost; video: HTMLVideoElement }>();
  @Output() metadataLoadedEvent = new EventEmitter<{ post: ExplorePost; video: HTMLVideoElement }>();

  @ViewChild('videoPlayer') videoPlayerRef!: ElementRef<HTMLVideoElement>;

  get videoElement(): HTMLVideoElement | null {
    return this.videoPlayerRef?.nativeElement ?? null;
  }

  deletePost() {
    this.deletePostEvent.emit(this.post);
  }

  onTogglePlay(video: HTMLVideoElement) {
    this.togglePlayEvent.emit({ post: this.post, video });
  }

  onToggleLike() {
    this.toggleLikeEvent.emit(this.post);
  }

  onOpenComments() {
    this.openCommentsEvent.emit(this.post);
  }

  onToggleMute(event: MouseEvent, video: HTMLVideoElement) {
    this.toggleMuteEvent.emit({ event, video });
  }

  onSeekTo(event: MouseEvent, video: HTMLVideoElement) {
    this.seekToEvent.emit({ event, post: this.post, video });
  }

  onTimeUpdate(video: HTMLVideoElement) {
    this.timeUpdateEvent.emit({ post: this.post, video });
  }

  onMetadataLoaded(video: HTMLVideoElement) {
    this.metadataLoadedEvent.emit({ post: this.post, video });
  }

  formatTime(seconds: number | undefined): string {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }
}
