import { WeekView } from '../models/sprint-update.model';

/**
 * The set of story point states that represent "past QA" completion.
 * These are stories that have completed QA and are ready for production or already deployed.
 */
export const PAST_QA_STATES = new Set(['ready for prod', 'closed', 'done']);

/**
 * Compute which week of the sprint we're in, based on today's date.
 *
 * @param startDateStr ISO date string or undefined for sprint start date
 * @param finishDateStr ISO date string or undefined for sprint end date
 * @param todayOverride Optional override for "today" (defaults to actual today)
 * @returns 'week1' (days 1-7), 'week2' (days 8+), or 'postSprint' (after finishDate)
 *
 * Logic:
 * - If no startDate, default to 'week1'
 * - If today < startDate, return 'week1'
 * - If today <= startDate + 7 days, return 'week1'
 * - If today > finishDate (if provided), return 'postSprint'
 * - Otherwise, return 'week2'
 */
export function computeWeek(
  startDateStr?: string,
  finishDateStr?: string,
  todayOverride?: Date
): WeekView {
  const today = todayOverride || new Date();
  today.setHours(0, 0, 0, 0);

  if (!startDateStr) return 'week1';

  const startDate = new Date(startDateStr);
  startDate.setHours(0, 0, 0, 0);

  if (today < startDate) {
    return 'week1';
  }

  const week1End = new Date(startDate);
  week1End.setDate(week1End.getDate() + 7);

  if (today <= week1End) {
    return 'week1';
  }

  if (finishDateStr) {
    const finishDate = new Date(finishDateStr);
    finishDate.setHours(0, 0, 0, 0);
    if (today > finishDate) {
      return 'postSprint';
    }
  }

  return 'week2';
}

/**
 * Check if a given state (normalized to lowercase) is in the "past QA" set.
 * Case-insensitive matching.
 *
 * @param stateNormalized The work item state, already normalized to lowercase
 * @returns true if the state represents completed QA work
 */
export function isPastQaState(stateNormalized: string): boolean {
  return PAST_QA_STATES.has(stateNormalized);
}

/**
 * Calculate the target story points for week 1 (50% of commitment).
 * Uses Math.round for banker's rounding.
 *
 * @param commitmentSp Total story points committed for the sprint
 * @returns 50% of commitment, rounded
 */
export function calculateTargetWeek1Sp(commitmentSp: number): number {
  return Math.round(commitmentSp * 0.5);
}
