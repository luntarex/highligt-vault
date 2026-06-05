import { Component } from '@angular/core';
import { Location } from '@angular/common';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-back-link',
  standalone: true,
  imports: [TranslocoModule],
  templateUrl: './back-link.html',
  styleUrl: './back-link.css',
})
export class BackLink {

  constructor(private location: Location) {}

  goBack(): void {
    this.location.back();
  }
}
