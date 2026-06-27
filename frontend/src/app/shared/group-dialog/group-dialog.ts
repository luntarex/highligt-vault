import { Component, EventEmitter, Input, Output } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { ClipGroup } from '../../core/models/clip-group';
import { BottomSheet } from '../bottom-sheet/bottom-sheet';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-group-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule, BottomSheet, TranslocoModule],
  templateUrl: './group-dialog.html',
  styleUrl: './group-dialog.css'
})
export class GroupDialog {
  @Input() groups: ClipGroup[] = [];
  @Input() clipCount = 0;

  @Output() createGroup = new EventEmitter<{ name: string; description: string }>();
  @Output() addToGroup = new EventEmitter<number>();
  @Output() cancelled = new EventEmitter<void>();

  selectedGroupId: number | null = null;
  isCreatingNew = true;
  groupName = '';
  groupDescription = '';

  ngOnChanges(): void {
    if (this.groups.length > 0 && this.selectedGroupId === null && !this.groupName.trim()) {
      this.isCreatingNew = false;
      this.selectedGroupId = this.groups[0].id;
    }
  }

  selectExisting(groupId: number): void {
    this.isCreatingNew = false;
    this.selectedGroupId = groupId;
  }

  selectNew(): void {
    this.isCreatingNew = true;
    this.selectedGroupId = null;
  }

  onSubmit(): void {
    if (this.isCreatingNew) {
      if (!this.groupName.trim()) return;
      this.createGroup.emit({
        name: this.groupName.trim(),
        description: this.groupDescription.trim()
      });
      return;
    }

    if (this.selectedGroupId !== null) {
      this.addToGroup.emit(this.selectedGroupId);
    }
  }

  onCancel(): void {
    this.cancelled.emit();
  }
}
