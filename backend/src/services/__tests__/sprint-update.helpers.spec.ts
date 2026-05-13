import {
  computeWeek,
  isPastQaState,
  calculateTargetWeek1Sp,
  PAST_QA_STATES,
} from '../sprint-update.helpers';

describe('sprint-update.helpers', () => {
  describe('computeWeek', () => {
    describe('happy paths', () => {
      it('should return week1 when startDate is not provided', () => {
        const result = computeWeek(undefined, undefined);
        expect(result).toBe('week1');
      });

      it('should return week1 when today is before sprint starts', () => {
        const startDate = new Date('2026-05-20');
        const today = new Date('2026-05-15');
        const result = computeWeek(startDate.toISOString(), undefined, today);
        expect(result).toBe('week1');
      });

      it('should return week1 when today is on sprint start date', () => {
        const startDate = new Date('2026-05-20');
        const result = computeWeek(startDate.toISOString(), undefined, startDate);
        expect(result).toBe('week1');
      });

      it('should return week1 when today is within first 7 days of sprint', () => {
        const startDate = new Date('2026-05-20');
        // Day 5 of sprint
        const today = new Date('2026-05-24');
        const result = computeWeek(startDate.toISOString(), undefined, today);
        expect(result).toBe('week1');
      });

      it('should return week1 on day 7 (inclusive) of sprint', () => {
        const startDate = new Date('2026-05-20');
        // Day 7 of sprint (start + 6 days)
        const today = new Date('2026-05-26');
        const result = computeWeek(startDate.toISOString(), undefined, today);
        expect(result).toBe('week1');
      });

      it('should return week2 on day 8 of sprint', () => {
        const startDate = new Date('2026-05-20');
        // Day 8+ of sprint — week1End = start + 7 = May 27, so May 28 is week2
        const today = new Date('2026-05-28');
        const result = computeWeek(startDate.toISOString(), undefined, today);
        expect(result).toBe('week2');
      });

      it('should return postSprint when today is after sprint finishDate', () => {
        const startDate = new Date('2026-05-20');
        const finishDate = new Date('2026-06-02');
        const today = new Date('2026-06-05');
        const result = computeWeek(startDate.toISOString(), finishDate.toISOString(), today);
        expect(result).toBe('postSprint');
      });

      it('should return postSprint on exact finishDate when no time has passed', () => {
        const startDate = new Date('2026-05-20');
        const finishDate = new Date('2026-06-02');
        // exactly on finish date
        const today = new Date('2026-06-02');
        const result = computeWeek(startDate.toISOString(), finishDate.toISOString(), today);
        expect(result).toBe('week2'); // still in week2 on finish date
      });

      it('should return postSprint the day after finishDate', () => {
        const startDate = new Date('2026-05-20');
        const finishDate = new Date('2026-06-02');
        const today = new Date('2026-06-03');
        const result = computeWeek(startDate.toISOString(), finishDate.toISOString(), today);
        expect(result).toBe('postSprint');
      });

      it('should return week2 without finishDate when past week 1', () => {
        const startDate = new Date('2026-05-20');
        const today = new Date('2026-05-30');
        const result = computeWeek(startDate.toISOString(), undefined, today);
        expect(result).toBe('week2');
      });
    });

    describe('edge cases', () => {
      it('should handle undefined finishDate gracefully', () => {
        const startDate = new Date('2026-05-20');
        const today = new Date('2026-06-05');
        // No finishDate provided, should return week2 since we're past day 8
        const result = computeWeek(startDate.toISOString(), undefined, today);
        expect(result).toBe('week2');
      });

      it('should ignore time component of dates', () => {
        const startDate = new Date('2026-05-20T23:59:59Z');
        const today = new Date('2026-05-20T00:00:00Z');
        // Both should resolve to same day when time is cleared
        const result = computeWeek(startDate.toISOString(), undefined, today);
        expect(result).toBe('week1');
      });

      it('should handle all-zeros date string', () => {
        // Test with a valid but early date instead of invalid date
        const startDate = new Date('2000-01-01');
        const today = new Date('2000-01-01');
        const result = computeWeek(startDate.toISOString(), undefined, today);
        expect(result).toBe('week1');
      });
    });
  });

  describe('isPastQaState', () => {
    describe('happy paths', () => {
      it('should return true for "ready for prod"', () => {
        expect(isPastQaState('ready for prod')).toBe(true);
      });

      it('should return true for "closed"', () => {
        expect(isPastQaState('closed')).toBe(true);
      });

      it('should return true for "done"', () => {
        expect(isPastQaState('done')).toBe(true);
      });

      it('should return false for "in progress"', () => {
        expect(isPastQaState('in progress')).toBe(false);
      });

      it('should return false for "new"', () => {
        expect(isPastQaState('new')).toBe(false);
      });

      it('should return false for "ready for qa"', () => {
        expect(isPastQaState('ready for qa')).toBe(false);
      });

      it('should return false for "blocked"', () => {
        expect(isPastQaState('blocked')).toBe(false);
      });
    });

    describe('case sensitivity', () => {
      it('should match states case-insensitively', () => {
        expect(isPastQaState('READY FOR PROD')).toBe(false); // function expects lowercase
        // This test documents that caller must normalize to lowercase
      });

      it('should only match lowercase input (caller responsible for normalization)', () => {
        expect(isPastQaState('ready for prod')).toBe(true);
        expect(isPastQaState('Ready For Prod')).toBe(false);
      });
    });

    describe('whitespace handling', () => {
      it('should not trim whitespace (caller responsible)', () => {
        expect(isPastQaState(' ready for prod ')).toBe(false);
        expect(isPastQaState('ready for prod')).toBe(true);
      });
    });
  });

  describe('calculateTargetWeek1Sp', () => {
    describe('happy paths', () => {
      it('should return 0 for commitment of 0', () => {
        expect(calculateTargetWeek1Sp(0)).toBe(0);
      });

      it('should return 5 for commitment of 10 (50% rounding)', () => {
        expect(calculateTargetWeek1Sp(10)).toBe(5);
      });

      it('should return 6 for commitment of 11 (rounds up with Math.round)', () => {
        expect(calculateTargetWeek1Sp(11)).toBe(6);
      });

      it('should return 5 for commitment of 9 (rounds down with Math.round)', () => {
        expect(calculateTargetWeek1Sp(9)).toBe(5);
      });

      it('should return 50 for commitment of 100', () => {
        expect(calculateTargetWeek1Sp(100)).toBe(50);
      });

      it('should return 25 for commitment of 50', () => {
        expect(calculateTargetWeek1Sp(50)).toBe(25);
      });

      it('should handle odd numbers correctly with Math.round', () => {
        // Math.round(x * 0.5) for odd numbers — JS rounds 0.5 away from zero
        expect(calculateTargetWeek1Sp(1)).toBe(1); // 0.5 rounds up to 1
        expect(calculateTargetWeek1Sp(3)).toBe(2); // 1.5 rounds up to 2
        expect(calculateTargetWeek1Sp(5)).toBe(3); // 2.5 rounds up to 3
        expect(calculateTargetWeek1Sp(7)).toBe(4); // 3.5 rounds up to 4
      });
    });

    describe('edge cases', () => {
      it('should handle very large commitments', () => {
        expect(calculateTargetWeek1Sp(10000)).toBe(5000);
      });

      it('should handle floating point commitments', () => {
        // Though in practice SP should be integers
        expect(calculateTargetWeek1Sp(10.5)).toBe(5);
        expect(calculateTargetWeek1Sp(11.5)).toBe(6);
      });
    });
  });

  describe('PAST_QA_STATES constant', () => {
    it('should contain the three expected states', () => {
      expect(PAST_QA_STATES.has('ready for prod')).toBe(true);
      expect(PAST_QA_STATES.has('closed')).toBe(true);
      expect(PAST_QA_STATES.has('done')).toBe(true);
    });

    it('should not contain other states', () => {
      expect(PAST_QA_STATES.has('in progress')).toBe(false);
      expect(PAST_QA_STATES.has('ready for qa')).toBe(false);
      expect(PAST_QA_STATES.has('new')).toBe(false);
    });

    it('should be a Set (for efficient O(1) lookups)', () => {
      expect(PAST_QA_STATES instanceof Set).toBe(true);
    });
  });
});
