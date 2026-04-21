import { Component } from '@angular/core';
import { trigger, style, animate, transition, stagger, query } from '@angular/animations';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
  animations: [
    trigger('infoCards', [
      transition(':enter', [
        query('.info-card', [
          style({ opacity: 0, transform: 'translateY(28px)' }),
          stagger(80, animate('380ms ease-out', style({ opacity: 1, transform: 'translateY(0)' }))),
        ], { optional: true }),
      ]),
    ]),
  ],
})
export class HomeComponent {}
