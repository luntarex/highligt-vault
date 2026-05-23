import { Component, Input, Output, EventEmitter } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';

@Component({
  selector: 'app-group-dialog',
  standalone: true,
  imports: [CommonModule, FormsModule],
  templateUrl: './group-dialog.html',
  styleUrls: ['./group-dialog.css']
})
export class GroupDialog {
  @Input() mode: 'create' | 'edit' = 'create';
  @Input() initialName: string = '';
  @Input() initialDescription: string = '';
  
  @Output() saved = new EventEmitter<{name: string, description: string}>();
  @Output() cancelled = new EventEmitter<void>();

  name: string = '';
  description: string = '';

  ngOnInit() {
    this.name = this.initialName;
    this.description = this.initialDescription;
  }

  onSave() {
    if (this.name.trim()) {
      this.saved.emit({ name: this.name.trim(), description: this.description.trim() });
    }
  }

  onCancel() {
    this.cancelled.emit();
  }
}
