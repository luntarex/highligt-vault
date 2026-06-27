import { Component, Input, Output, EventEmitter, ElementRef, HostListener } from '@angular/core';
import { CommonModule } from '@angular/common';
import { BottomSheet } from '../bottom-sheet/bottom-sheet';

@Component({
  selector: 'app-custom-dropdown',
  standalone: true,
  imports: [CommonModule, BottomSheet],
  templateUrl: './custom-dropdown.html',
  styleUrls: ['./custom-dropdown.css']
})
export class CustomDropdownComponent {
  @Input() options: string[] = [];
  @Input() label: string = '';
  @Input() selectedOption: string = '';
  @Output() selectedOptionChange = new EventEmitter<string>();

  isOpen = false;

  constructor(private eRef: ElementRef) {}

  toggleDropdown() {
    this.isOpen = !this.isOpen;
  }

  selectOption(option: string) {
    this.selectedOption = option;
    this.selectedOptionChange.emit(this.selectedOption);
    this.isOpen = false;
  }

  isMobile(): boolean {
    return window.matchMedia('(max-width: 768px)').matches;
  }

  @HostListener('document:click', ['$event'])
  clickout(event: Event) {
    if (!this.eRef.nativeElement.contains(event.target)) {
      this.isOpen = false;
    }
  }
}
