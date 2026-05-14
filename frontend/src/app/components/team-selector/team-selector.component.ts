import { Component, OnInit } from '@angular/core';
import { TeamStoreService } from '../../services/team-store.service';
import { TeamDTO } from '../../models/team.model';
import { Observable } from 'rxjs';

@Component({
  selector: 'app-team-selector',
  templateUrl: './team-selector.component.html',
  styleUrls: ['./team-selector.component.scss'],
})
export class TeamSelectorComponent implements OnInit {
  teams$: Observable<TeamDTO[]>;
  current$: Observable<TeamDTO | null>;
  loading$: Observable<boolean>;

  constructor(public teamStore: TeamStoreService) {
    this.teams$ = this.teamStore.teams$;
    this.current$ = this.teamStore.current$;
    this.loading$ = this.teamStore.loading$;
  }

  ngOnInit(): void {
    this.teamStore.loadTeams();
  }

  onTeamChange(team: TeamDTO): void {
    this.teamStore.setTeam(team);
  }

  displayTeamLabel(team: TeamDTO | null): string {
    if (!team) return '';
    const iter = team.currentIteration ? ` (${team.currentIteration.name})` : '';
    return `${team.name}${iter}`;
  }
}
