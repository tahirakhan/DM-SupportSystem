import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import { FormControl } from '@angular/forms';
import { ConfigService } from '../../services/config.service';
import { AdoApiService } from '../../services/ado-api.service';

@Component({
  selector: 'app-filters-bar',
  templateUrl: './filters-bar.component.html',
  styleUrls: ['./filters-bar.component.scss'],
})
export class FiltersBarComponent implements OnInit {
  @Input() loading = false;
  @Output() fetchRequested = new EventEmitter<void>();

  areaPaths: string[] = [];
  iterationPaths: string[] = [];

  areaPathControl = new FormControl<string>('');
  iterationPathControl = new FormControl<string>('');

  constructor(
    private configService: ConfigService,
    private adoApiService: AdoApiService,
  ) {}

  ngOnInit(): void {
    const { areaPath, iterationPath } = this.configService.currentFilters;
    this.areaPathControl.setValue(areaPath);
    this.iterationPathControl.setValue(iterationPath);

    this.adoApiService.getAreaPaths().subscribe({
      next: paths => {
        this.areaPaths = paths.length ? paths : [areaPath];
        if (!this.areaPathControl.value) this.areaPathControl.setValue(areaPath);
      },
      error: () => {
        this.configService.areaPaths$.subscribe(paths => {
          this.areaPaths = paths.length ? paths : [areaPath];
        });
      },
    });

    this.configService.iterationPaths$.subscribe(paths => {
      this.iterationPaths = paths.length ? paths : [iterationPath];
    });

    this.areaPathControl.valueChanges.subscribe(value => {
      if (value) this.configService.updateAreaPath(value);
    });

    this.iterationPathControl.valueChanges.subscribe(value => {
      if (value) this.configService.updateIterationPath(value);
    });
  }
}
