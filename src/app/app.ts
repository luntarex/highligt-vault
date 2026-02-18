import { CommonModule } from '@angular/common';
import { Component, signal } from '@angular/core';
import { RouterOutlet } from '@angular/router';
import { Sidebar } from "./components/sidebar/sidebar";
import { Library } from './components/library/library';
import { CustomUpload } from './components/custom-upload/custom-upload';

@Component({
  selector: 'app-root',
  imports: [CommonModule, RouterOutlet, Sidebar, CustomUpload],
  templateUrl: './app.html',
  styleUrl: './app.css'
})
export class App {
  protected readonly title = signal('highlight-vault');
  protected showUpload = false;

  onUploadClick() {
    this.showUpload = true;
  }

  onUploadClose() {
    this.showUpload = false;
  }
}
