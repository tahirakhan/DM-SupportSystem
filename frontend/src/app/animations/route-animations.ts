import {
  trigger,
  transition,
  style,
  animate,
  query,
  group,
} from '@angular/animations';

export const routeAnimations = trigger('routeAnimations', [
  transition('home => features', [
    group([
      query(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(-30px)' })),
      ], { optional: true }),
      query(':enter', [
        style({ opacity: 0, transform: 'translateX(40px)' }),
        animate('280ms 120ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ], { optional: true }),
    ]),
  ]),
  transition('features => home', [
    group([
      query(':leave', [
        animate('200ms ease-in', style({ opacity: 0, transform: 'translateX(30px)' })),
      ], { optional: true }),
      query(':enter', [
        style({ opacity: 0, transform: 'translateX(-40px)' }),
        animate('280ms 120ms ease-out', style({ opacity: 1, transform: 'translateX(0)' })),
      ], { optional: true }),
    ]),
  ]),
  transition('* <=> *', [
    query(':enter', [
      style({ opacity: 0, transform: 'translateY(16px)' }),
      animate('280ms ease-out', style({ opacity: 1, transform: 'translateY(0)' })),
    ], { optional: true }),
  ]),
]);
