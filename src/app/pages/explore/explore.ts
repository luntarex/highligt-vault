import { Component, OnDestroy, OnInit } from '@angular/core';
import { ExplorePost } from '../../models/explore-post';
import { ExploreService } from '../../services/explore.service';
import { RouterLink } from "@angular/router";
import { NgClass } from "@angular/common";
import { ClipService } from '../../services/clip.service';

@Component({
  selector: 'app-explore',
  templateUrl: './explore.html',
  styleUrls: ['./explore.css'],
  imports: [RouterLink, NgClass]
})
export class Explore implements OnInit, OnDestroy {

  feed: ExplorePost[] = [];
  playingPostId: string | null = null;
  private animationFrameId: number | null = null;

  constructor(private exploreService: ExploreService, private clipService: ClipService) { }

  ngOnInit(): void {
    this.loadServiceData();
  }

  ngOnDestroy(): void {
    this.stopProgressLoop();
  }

  loadServiceData(): void {
    this.exploreService.getFeed().subscribe((feedData) => {
      this.feed = feedData.map(post => ({
        ...post,
        currentTime: 0,
        duration: 0
      }));
    });
  }

  onTimeUpdate(post: ExplorePost, video: HTMLVideoElement) {
    
    if (this.playingPostId !== post.id) {
      post.currentTime = video.currentTime;
    }
  }

  onMetadataLoaded(post: ExplorePost, video: HTMLVideoElement) {
    post.duration = video.duration;
  }

  seekTo(event: MouseEvent, post: ExplorePost, video: HTMLVideoElement) {
    event.stopPropagation();
    const container = event.currentTarget as HTMLElement;
    const rect = container.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const percentage = x / rect.width;
    video.currentTime = percentage * (post.duration || 0);
    post.currentTime = video.currentTime;
  }

  formatTime(seconds: number | undefined): string {
    if (!seconds) return '0:00';
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s < 10 ? '0' : ''}${s}`;
  }

  togglePlay(post: ExplorePost, video: HTMLVideoElement) {
    if (this.playingPostId === post.id) {
      video.pause();
      this.playingPostId = null;
      this.stopProgressLoop();
    } else {
      video.play();
      this.playingPostId = post.id;
      this.startProgressLoop(post, video);
    }
  }

  private startProgressLoop(post: ExplorePost, video: HTMLVideoElement) {
    this.stopProgressLoop();
    const update = () => {
      post.currentTime = video.currentTime;
      this.animationFrameId = requestAnimationFrame(update);
    };
    this.animationFrameId = requestAnimationFrame(update);
  }

  private stopProgressLoop() {
    if (this.animationFrameId !== null) {
      cancelAnimationFrame(this.animationFrameId);
      this.animationFrameId = null;
    }
  }

  toggleLike(post: ExplorePost) {
    post.isLiked = !post.isLiked;
    post.isLiked ? post.likes++ : post.likes--;
  }

  openComments(post: ExplorePost) {
    console.log('Opening comments for:', post.id);
  }
}
