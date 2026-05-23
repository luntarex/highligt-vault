import { Component } from '@angular/core';

@Component({
  selector: 'app-about-us',
  templateUrl: './about-us.html',
  styleUrls: ['./about-us.css'],
  standalone: true,
  imports: []
})
export class AboutUs {
  teamMembers = [
    'Murat Kazancıoğlu',
    'Efe Şahin',
    'Barış Parlak',
    'Kaan Beşe'
  ];
}
