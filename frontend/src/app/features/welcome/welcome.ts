import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-welcome',
  imports: [RouterModule, TranslocoModule],
  templateUrl: './welcome.html',
  styleUrl: './welcome.css',
})
export class Welcome {}
