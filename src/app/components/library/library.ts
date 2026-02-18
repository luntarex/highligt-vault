import { ClipCard } from './../clip-card/clip-card';
import { Component,OnInit } from '@angular/core';
import {CommonModule } from '@angular/common';
import { ClipService } from '../../services/clip.service';
import { Clip } from '../../models/clip'
import { CustomDropdownComponent } from '../custom-dropdown/custom-dropdown';
import { RouterLink, RouterLinkActive } from "@angular/router";
import { FormsModule } from '@angular/forms';


@Component({
  selector: 'app-library',
  imports: [CommonModule, ClipCard, CustomDropdownComponent, RouterLink, RouterLinkActive, FormsModule],
  templateUrl: './library.html',
  styleUrl: './library.css',
})
export class Library implements OnInit {

  games = ['All Games', 'CS2', 'LOL', 'Valorant', 'Dota 2', 'Rocket League', 'Apex Legends', 'Overwatch', 'Fortnite', 'PUBG', 'Marvel Rivals'];
  tags = ['All Tags', 'Ace', 'Clutch', 'Funny', 'Fail', 'Sniper', 'Win'];
  sortOptions = ['Date', 'Duration'];

  clips: Clip[] = [];

  constructor(private clipService: ClipService) {}

  ngOnInit(): void {
   this.clips = this.clipService.getClips();
  }
  handleDelete(id: number) {
    this.clipService.deleteClip(id);
    this.clips = this.clipService.getClips();
  }

  searchQuery: string = '';

  onSearch() {
    this.clips = this.clipService.getClips().filter(clip =>
      clip.title.toLowerCase().startsWith(this.searchQuery.toLowerCase())
    );
  }
}
