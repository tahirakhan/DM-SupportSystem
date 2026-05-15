import { adoService } from './ado.service';
import { cacheService } from './cache.service';
import {
  SprintProgressData,
  SprintMeta,
  TeamMeta,
  SprintSummary,
  StateBreakdown,
  StateBucket,
  Burndown,
  BurndownPoint,
  ScopeChangeItem,
  AtRiskItem,
  BlockedItem,
} from '../models/sprint-progress.model';
import { WorkItem } from '../models/work-item.model';

const STALE_DAYS = 3;
const LATE_ACTIVE_PCT = 0.75;
const PAST_QA_STATES = new Set(['ready for prod', 'closed', 'done']);
const BLOCKED_STATES = new Set(['blocked']);
const BLOCKED_TAG = 'blocked';
const ACTIVE_KEY_HINTS = ['in development', 'active', 'in progress', 'in qa', 'ready for qa', 'testing', 'dev complete'];
const NEW_KEY_HINTS = ['new', 'to do', 'todo', 'analysis', 'sprint ready', 'ready'];

class SprintProgressService {
  async getSprintProgress(
    teamId: string,
    sprintId?: string,
    refresh = false,
  ): Promise<SprintProgressData> {
    // Resolve team
    const teams = await adoService.getTeams();
    const team = teams.find((t) => t.id === teamId);
    if (!team) {
      const err = new Error('team not found');
      (err as any).status = 404;
      throw err;
    }

    // Resolve sprint
    let sprint = sprintId
      ? team.currentIteration // TODO: fetch by sprintId if needed
      : team.currentIteration;

    if (!sprint) {
      const err = new Error('no active sprint found for team');
      (err as any).status = 404;
      throw err;
    }

    const cacheKey = `sprint-progress:${teamId}:${sprint.id}`;
    const finishDate = sprint.finishDate ? new Date(sprint.finishDate).getTime() : Date.now();
    const ttl = Date.now() <= finishDate ? 900 : 86400;

    if (refresh) {
      await cacheService.invalidate(cacheKey);
    }

    const cached = await cacheService.get<SprintProgressData>(cacheKey);
    if (cached) {
      cached.meta.cached = true;
      cached.meta.cachedAt = new Date(
        new Date().getTime() - (ttl - 100) * 1000,
      ).toISOString();
      return cached;
    }

    const data = await this.fetchSprintProgress(team, sprint);
    await cacheService.set<SprintProgressData>(cacheKey, data, ttl);
    data.meta.cached = false;
    return data;
  }

  private async fetchSprintProgress(
    team: any,
    sprint: any,
  ): Promise<SprintProgressData> {
    const sprintStartDate = sprint.startDate ? new Date(sprint.startDate).getTime() : Date.now();
    const sprintFinishDate = sprint.finishDate ? new Date(sprint.finishDate).getTime() : Date.now();
    const today = Date.now();

    // Query stories + defects in the sprint
    const workItemIds = await adoService.querySprintItemIds(team.areaPath, sprint.path);

    const fields = [
      'System.Id',
      'System.Title',
      'System.WorkItemType',
      'System.State',
      'System.AreaPath',
      'System.IterationPath',
      'Microsoft.VSTS.Scheduling.StoryPoints',
      'System.CreatedDate',
      'System.ChangedDate',
      'System.AssignedTo',
      'System.Tags',
    ];

    const workItems =
      workItemIds.length > 0
        ? await adoService.batchFetchWorkItemsWithFields(workItemIds, fields)
        : [];

    // Build summary
    let totalSp = 0;
    let doneSp = 0;
    let doneItems = 0;
    const stateMap = new Map<StateBucket, { sp: number; count: number }>();

    for (const bucket of ['New', 'Active', 'Resolved', 'Closed', 'Blocked', 'Other'] as StateBucket[]) {
      stateMap.set(bucket, { sp: 0, count: 0 });
    }

    const scopeChangeItems: ScopeChangeItem[] = [];
    const atRiskItems: AtRiskItem[] = [];
    const blockedItems: BlockedItem[] = [];

    for (const wi of workItems) {
      const sp = wi.fields['Microsoft.VSTS.Scheduling.StoryPoints'] ?? 0;
      const state = wi.fields['System.State']?.toLowerCase() ?? '';
      const createdDate = wi.fields['System.CreatedDate']
        ? new Date(wi.fields['System.CreatedDate']).getTime()
        : sprintStartDate;
      const changedDate = wi.fields['System.ChangedDate']
        ? new Date(wi.fields['System.ChangedDate']).getTime()
        : sprintStartDate;

      totalSp += sp;

      const isDone = PAST_QA_STATES.has(state);
      if (isDone) {
        doneSp += sp;
        doneItems++;
      }

      // Classify state
      const bucket = this.classifyState(state, wi.fields['System.Tags'] ?? '');
      const current = stateMap.get(bucket)!;
      current.sp += sp;
      current.count++;

      // Scope change: added after sprint start
      if (createdDate > sprintStartDate) {
        scopeChangeItems.push({
          id: wi.id,
          title: wi.fields['System.Title'],
          sp,
          addedOn: wi.fields['System.CreatedDate'] ?? new Date().toISOString(),
        });
      }

      // At-risk items
      if (!isDone && ACTIVE_KEY_HINTS.some((hint) => state.includes(hint))) {
        const daysSinceUpdate = Math.ceil((today - changedDate) / 86_400_000);
        if (daysSinceUpdate >= STALE_DAYS) {
          atRiskItems.push({
            id: wi.id,
            title: wi.fields['System.Title'],
            state: wi.fields['System.State'],
            assignedTo: wi.fields['System.AssignedTo']?.displayName ?? 'Unassigned',
            daysSinceUpdate,
            reason: 'no-updates',
          });
        } else {
          const percentElapsed = ((today - sprintStartDate) / (sprintFinishDate - sprintStartDate)) * 100;
          if (percentElapsed >= LATE_ACTIVE_PCT * 100) {
            atRiskItems.push({
              id: wi.id,
              title: wi.fields['System.Title'],
              state: wi.fields['System.State'],
              assignedTo: wi.fields['System.AssignedTo']?.displayName ?? 'Unassigned',
              daysSinceUpdate,
              reason: 'late-active',
            });
          }
        }
      }

      // Blocked items
      if (
        BLOCKED_STATES.has(state) ||
        (wi.fields['System.Tags'] ?? '').toLowerCase().includes(BLOCKED_TAG)
      ) {
        const source = BLOCKED_STATES.has(state) ? 'state' : 'tag';
        blockedItems.push({
          id: wi.id,
          title: wi.fields['System.Title'],
          state: wi.fields['System.State'],
          assignedTo: wi.fields['System.AssignedTo']?.displayName ?? 'Unassigned',
          source,
        });
      }
    }

    // Build state breakdown
    const stateBreakdown: StateBreakdown[] = [];
    for (const bucket of ['New', 'Active', 'Resolved', 'Closed', 'Blocked', 'Other'] as StateBucket[]) {
      const { sp, count } = stateMap.get(bucket)!;
      stateBreakdown.push({ state: bucket, sp, count });
    }

    // Build burndown
    const idealBurndown = this.buildIdealBurndown(sprintStartDate, sprintFinishDate, totalSp);
    const actualToday: BurndownPoint = {
      day: new Date(today).toISOString().slice(0, 10),
      sp: totalSp - doneSp,
    };

    const daysRemaining = Math.ceil((sprintFinishDate - today) / 86_400_000);
    const percentElapsed = Math.round(((today - sprintStartDate) / (sprintFinishDate - sprintStartDate)) * 100);

    const sprintMeta: SprintMeta = {
      id: sprint.id,
      name: sprint.name,
      path: sprint.path,
      startDate: sprint.startDate,
      finishDate: sprint.finishDate,
      daysRemaining: Math.max(0, daysRemaining),
      percentElapsed: Math.min(100, Math.max(0, percentElapsed)),
    };

    const teamMeta: TeamMeta = {
      id: team.id,
      name: team.name,
      areaPath: team.areaPath,
    };

    const summary: SprintSummary = {
      totalSp,
      doneSp,
      totalItems: workItems.length,
      doneItems,
      pctCompleteBySp: totalSp > 0 ? Math.round((doneSp / totalSp) * 100) : 0,
      pctCompleteByCount: workItems.length > 0 ? Math.round((doneItems / workItems.length) * 100) : 0,
    };

    return {
      sprint: sprintMeta,
      team: teamMeta,
      summary,
      stateBreakdown,
      burndown: {
        ideal: idealBurndown,
        actualToday,
      },
      scopeChange: { addedAfterStart: scopeChangeItems },
      atRiskItems,
      blockedItems,
      meta: { cached: false },
    };
  }

  private classifyState(state: string, tags: string): StateBucket {
    const s = state.toLowerCase().trim();

    if (NEW_KEY_HINTS.some((hint) => s.includes(hint))) return 'New';
    if (ACTIVE_KEY_HINTS.some((hint) => s.includes(hint))) return 'Active';
    if (s.includes('resolved')) return 'Resolved';
    if (PAST_QA_STATES.has(s)) return 'Closed';
    if (BLOCKED_STATES.has(s) || tags.toLowerCase().includes(BLOCKED_TAG)) return 'Blocked';
    return 'Other';
  }

  private buildIdealBurndown(startDate: number, endDate: number, totalSp: number): BurndownPoint[] {
    const points: BurndownPoint[] = [];
    const days = Math.ceil((endDate - startDate) / 86_400_000);
    const spPerDay = totalSp / Math.max(1, days);

    for (let i = 0; i <= days; i++) {
      const dayTime = startDate + i * 86_400_000;
      const day = new Date(dayTime).toISOString().slice(0, 10);
      const sp = Math.max(0, totalSp - spPerDay * i);
      points.push({ day, sp: Math.round(sp * 10) / 10 });
    }

    return points;
  }

}

export const sprintProgressService = new SprintProgressService();
