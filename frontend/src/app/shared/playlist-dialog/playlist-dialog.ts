import { Component, Input, Output, EventEmitter, ElementRef, ViewChild, AfterViewInit, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-playlist-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './playlist-dialog.html',
  styleUrl: './playlist-dialog.css'
})
export class PlaylistDialog implements AfterViewInit, OnInit {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initialName: string = '';
  @Input() initialDescription: string = '';

  playlistName: string = '';
  playlistDescription: string = '';

  @Output() created = new EventEmitter<{ name: string; description: string }>();
  @Output() cancelled = new EventEmitter<void>();

  @ViewChild('nameInput') nameInput!: ElementRef<HTMLInputElement>;

  ngOnInit(): void {
    if (this.mode === 'edit') {
      this.playlistName = this.initialName;
      this.playlistDescription = this.initialDescription;
    }
  }

  ngAfterViewInit(): void {
    setTimeout(() => this.nameInput?.nativeElement?.focus(), 100);
  }

  onCancel() {
    this.cancelled.emit();
  }

  onSubmit() {
    if (this.playlistName.trim().length > 0) {
      this.created.emit({
        name: this.playlistName.trim(),
        description: this.playlistDescription.trim()
      });
    }
  }

  get dialogTitle(): string {
    return this.mode === 'edit' ? 'Edit Playlist' : 'Create Playlist';
  }

  get submitLabel(): string {
    return this.mode === 'edit' ? 'Save' : 'Create';
  }
}
