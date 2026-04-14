import { ClipCard } from './clip-card/clip-card';
import { Component, OnInit, ChangeDetectorRef } from '@angular/core';
import { CommonModule } from '@angular/common';
import { ClipService } from '../../core/services/clip.service';
import { ProfileService } from '../../core/services/profile.service';
import { AuthService } from '../../core/services/auth.service';
import { GameService } from '../../core/services/game.service';
import { Clip } from '../../core/models/clip'
import { CustomDropdownComponent } from '../../shared/custom-dropdown/custom-dropdown';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { FormsModule } from '@angular/forms';
import { User } from '../../core/models/user';


@Component({
  selector: 'app-library',
  imports: [CommonModule, ClipCard, CustomDropdownComponent, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './library.html',
  styleUrl: './library.css',
})
export class Library implements OnInit {

  games = ['All Games'];
  tags = ['All Tags', 'Ace', 'Clutch', 'Funny', 'Fail', 'Sniper', 'Win'];
  sortOptions = ['Date', 'Duration'];

  clips: Clip[] = [];
  user: User | null = null;

  constructor(
    private clipService: ClipService,
    private profileService: ProfileService,
    private authService: AuthService,
    private gameService: GameService,
    private cdr: ChangeDetectorRef
  ) {}

  ngOnInit(): void {
    const userId = this.authService.getCurrentUserId();
    this.clipService.getClips(userId).subscribe(clips => {
      this.clips = clips;
      this.cdr.detectChanges();
    });

    this.gameService.getGameNames().subscribe(names => {
      this.games = ['All Games', ...names];
      this.cdr.detectChanges();
    });

    const currentUserId = this.authService.getCurrentUserId();
    if (currentUserId) {
      this.profileService.getUserProfile(currentUserId.toString()).subscribe(profile => {
        this.user = profile;
        this.cdr.detectChanges();
      });
    }
  }
  handleDelete(id: number) {
    this.clipService.deleteClip(id).subscribe(() => {
      this.clipService.getClips().subscribe(clips => {
        this.clips = clips;
        this.cdr.detectChanges();
      });
    });
  }

  searchQuery: string = '';

  onSearch() {
    this.clipService.getClips().subscribe(clips => {
      this.clips = clips.filter(clip =>
        clip.title.toLowerCase().startsWith(this.searchQuery.toLowerCase())
      );
    });
  }
}
