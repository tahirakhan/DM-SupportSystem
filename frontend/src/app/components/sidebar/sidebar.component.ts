import { Component, EventEmitter, Input, Output } from '@angular/core';
import { Router } from '@angular/router';
import {
  trigger, state, style, transition, animate,
} from '@angular/animations';

interface NavItem {
  label: string;
  icon: string;
  route: string;
}

@Component({
  selector: 'app-sidebar',
  templateUrl: './sidebar.component.html',
  styleUrls: ['./sidebar.component.scss'],
  animations: [
    trigger('labelFade', [
      state('visible', style({ opacity: 1, width: '*' })),
      state('hidden', style({ opacity: 0, width: '0px' })),
      transition('visible <=> hidden', animate('200ms ease')),
    ]),
  ],
})
export class SidebarComponent {
  @Input() collapsed = false;
  @Output() toggleCollapsed = new EventEmitter<void>();

  navItems: NavItem[] = [
    { label: 'Home',              icon: 'home',           route: '/home' },
    { label: 'Feature Dashboard', icon: 'dashboard',      route: '/features' },
    { label: 'Release Dashboard', icon: 'rocket_launch',  route: '/release' },
    { label: 'PI Dashboard',      icon: 'view_timeline',  route: '/pi' },
    { label: 'Sprint Progress',   icon: 'monitoring',     route: '/sprint-progress' },
  ];

  constructor(private router: Router) {}

  navigate(route: string): void {
    this.router.navigate([route]);
  }

  isActive(route: string): boolean {
    return this.router.url === route;
  }
}
