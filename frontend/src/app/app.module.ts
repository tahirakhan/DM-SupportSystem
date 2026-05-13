import { NgModule, APP_INITIALIZER } from '@angular/core';
import { BrowserModule } from '@angular/platform-browser';
import { BrowserAnimationsModule } from '@angular/platform-browser/animations';
import { HttpClientModule } from '@angular/common/http';
import { ReactiveFormsModule } from '@angular/forms';

import { MatToolbarModule } from '@angular/material/toolbar';
import { MatIconModule } from '@angular/material/icon';
import { MatSelectModule } from '@angular/material/select';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatCardModule } from '@angular/material/card';
import { MatProgressBarModule } from '@angular/material/progress-bar';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatButtonModule } from '@angular/material/button';
import { MatSnackBarModule } from '@angular/material/snack-bar';
import { MatChipsModule } from '@angular/material/chips';
import { MatTooltipModule } from '@angular/material/tooltip';
import { MatRippleModule } from '@angular/material/core';
import { MatDividerModule } from '@angular/material/divider';

import { AppRoutingModule } from './app-routing.module';
import { ConfigService } from './services/config.service';

import { AppComponent } from './app.component';
import { SidebarComponent } from './components/sidebar/sidebar.component';
import { HomeComponent } from './components/home/home.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ReleaseDashboardComponent } from './components/release-dashboard/release-dashboard.component';
import { FiltersBarComponent } from './components/filters-bar/filters-bar.component';
import { FeatureCardComponent } from './components/feature-card/feature-card.component';
import { ProgressRingComponent } from './components/progress-ring/progress-ring.component';
import { PiDashboardComponent } from './components/pi-dashboard/pi-dashboard.component';
import { SprintCardComponent } from './components/pi-dashboard/sprint-card/sprint-card.component';
import { FeatureSprintTableComponent } from './components/pi-dashboard/feature-sprint-table/feature-sprint-table.component';
import { PiBurnupComponent } from './components/pi-dashboard/pi-burnup/pi-burnup.component';

@NgModule({
  declarations: [
    AppComponent,
    SidebarComponent,
    HomeComponent,
    DashboardComponent,
    ReleaseDashboardComponent,
    FiltersBarComponent,
    FeatureCardComponent,
    ProgressRingComponent,
    PiDashboardComponent,
    SprintCardComponent,
    FeatureSprintTableComponent,
    PiBurnupComponent,
  ],
  imports: [
    BrowserModule,
    BrowserAnimationsModule,
    HttpClientModule,
    ReactiveFormsModule,
    AppRoutingModule,
    MatToolbarModule,
    MatIconModule,
    MatSelectModule,
    MatFormFieldModule,
    MatCardModule,
    MatProgressBarModule,
    MatProgressSpinnerModule,
    MatButtonModule,
    MatSnackBarModule,
    MatChipsModule,
    MatTooltipModule,
    MatRippleModule,
    MatDividerModule,
  ],
  providers: [
    {
      provide: APP_INITIALIZER,
      useFactory: (cfg: ConfigService) => () => cfg.init(),
      deps: [ConfigService],
      multi: true,
    },
  ],
  bootstrap: [AppComponent],
})
export class AppModule {}
