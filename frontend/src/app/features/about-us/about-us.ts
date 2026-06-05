import { Component } from '@angular/core';
import { TranslocoModule } from '@jsverse/transloco';

@Component({
  selector: 'app-about-us',
  templateUrl: './about-us.html',
  styleUrls: ['./about-us.css'],
  standalone: true,
  imports: [TranslocoModule]
})
export class AboutUs {
  teamMembers = [
    'Murat Kazancıoğlu',
    'Efe Şahin',
    'Barış Parlak',
    'Kaan Beşe',
    'Veli Doğan'
  ];
}
