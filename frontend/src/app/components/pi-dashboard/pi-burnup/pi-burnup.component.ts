import { Component, Input, OnChanges } from '@angular/core';
import { BurnupPoint } from '../../../models/pi.model';

interface ChartPoint { x: number; y: number; label: string; }

@Component({
  selector: 'app-pi-burnup',
  templateUrl: './pi-burnup.component.html',
  styleUrls: ['./pi-burnup.component.scss'],
})
export class PiBurnupComponent implements OnChanges {
  @Input() burnup: BurnupPoint[] = [];

  readonly W = 800;
  readonly H = 240;
  readonly PAD = { top: 20, right: 24, bottom: 48, left: 48 };

  actualLine = '';
  targetLine = '';
  actualPoints: ChartPoint[] = [];
  xLabels: { x: number; label: string }[] = [];
  yTicks: { y: number; value: number }[] = [];
  maxY = 0;

  ngOnChanges(): void { this.buildChart(); }

  private buildChart(): void {
    if (!this.burnup.length) return;

    const innerW = this.W - this.PAD.left - this.PAD.right;
    const innerH = this.H - this.PAD.top - this.PAD.bottom;

    this.maxY = Math.max(...this.burnup.map(b => b.totalStories), 1);
    const yMax = Math.ceil(this.maxY / 5) * 5;

    const xOf = (i: number) => this.PAD.left + (i / Math.max(this.burnup.length - 1, 1)) * innerW;
    const yOf = (v: number) => this.PAD.top + innerH - (v / yMax) * innerH;

    // Actual line (cumulative done)
    this.actualLine = this.burnup
      .map((b, i) => `${i === 0 ? 'M' : 'L'}${xOf(i)},${yOf(b.doneStories)}`)
      .join(' ');

    // Target line (flat at totalStories)
    const target = this.burnup[0]?.totalStories ?? 0;
    this.targetLine = `M${xOf(0)},${yOf(target)} L${xOf(this.burnup.length - 1)},${yOf(target)}`;

    this.actualPoints = this.burnup.map((b, i) => ({
      x: xOf(i),
      y: yOf(b.doneStories),
      label: `${b.sprintName}: ${b.doneStories} done`,
    }));

    this.xLabels = this.burnup.map((b, i) => ({ x: xOf(i), label: b.sprintName }));

    this.yTicks = Array.from({ length: 6 }, (_, i) => {
      const val = Math.round((yMax / 5) * i);
      return { y: yOf(val), value: val };
    });
  }
}
