import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-progress-ring',
  templateUrl: './progress-ring.component.html',
  styleUrls: ['./progress-ring.component.scss'],
})
export class ProgressRingComponent {
  @Input() percent = 0;
  @Input() size = 88;
  @Input() strokeWidth = 9;

  get radius(): number {
    return (this.size - this.strokeWidth) / 2;
  }

  get circumference(): number {
    return 2 * Math.PI * this.radius;
  }

  get dashOffset(): number {
    const clamped = Math.min(100, Math.max(0, this.percent));
    return this.circumference * (1 - clamped / 100);
  }

  get center(): number {
    return this.size / 2;
  }

  get ringColor(): string {
    if (this.percent >= 100) return '#4caf50';
    if (this.percent >= 66) return '#2196f3';
    if (this.percent >= 33) return '#ff9800';
    return '#f44336';
  }

  get transform(): string {
    return `rotate(-90 ${this.center} ${this.center})`;
  }
}
