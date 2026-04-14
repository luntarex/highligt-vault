import { Component } from '@angular/core';
import { Location } from '@angular/common';

@Component({
  selector: 'app-back-link',
  standalone: true,
  templateUrl: './back-link.html',
  styleUrl: './back-link.css',
})
export class BackLink {

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}
