import { NgModule } from '@angular/core';
import { RouterModule, Routes } from '@angular/router';
import { HomeComponent } from './components/home/home.component';
import { DashboardComponent } from './components/dashboard/dashboard.component';
import { SprintUpdateDashboardComponent } from './components/sprint-update-dashboard/sprint-update-dashboard.component';

const routes: Routes = [
  { path: '',        redirectTo: 'home', pathMatch: 'full' },
  { path: 'home',     component: HomeComponent,      data: { animation: 'home' } },
  { path: 'features', component: DashboardComponent, data: { animation: 'features' } },
  { path: 'sprint-update', component: SprintUpdateDashboardComponent, data: { animation: 'sprintUpdate' } },
  { path: '**',      redirectTo: 'home' },
];

@NgModule({
  imports: [RouterModule.forRoot(routes)],
  exports: [RouterModule],
})
export class AppRoutingModule {}
