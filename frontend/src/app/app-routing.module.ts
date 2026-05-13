import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { ReleaseDashboardComponent } from './components/release-dashboard/release-dashboard.component';
import { PiDashboardComponent } from './components/pi-dashboard/pi-dashboard.component';

const routes: Routes = [
  { path: '',        redirectTo: 'home', pathMatch: 'full' },
  { path: 'home',     component: HomeComponent,            data: { animation: 'home' } },
  { path: 'features', component: DashboardComponent,       data: { animation: 'features' } },
  { path: 'release',  component: ReleaseDashboardComponent, data: { animation: 'release' } },
  { path: 'pi',       component: PiDashboardComponent,      data: { animation: 'pi' } },
  { path: '**',      redirectTo: 'home' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
