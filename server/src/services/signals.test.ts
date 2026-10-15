import { describe, it, expect } from 'vitest';
import {
  calculateReach,
  calculateImpact,
  calculateActivity,
  calculateBreadth,
  calculateDeveloperSignals,
  RepoData,
} from './signals.js';

describe('Signal Scores Calculations', () => {
  describe('Reach: min(100, 25 * log10(followers + 1))', () => {
    it('returns score: null and unavailable for 0 followers', () => {
      const res = calculateReach(0);
      expect(res.score).toBeNull();
      expect(res.raw).toBe('unavailable');
      expect(res.isAvailable).toBe(false);
      expect(res.qualityLabel).toContain('unavailable');
    });

    it('returns unavailable for negative or invalid followers', () => {
      const resNeg = calculateReach(-5);
      expect(resNeg.score).toBeNull();
      expect(resNeg.isAvailable).toBe(false);

      const resNaN = calculateReach(NaN);
      expect(resNaN.score).toBeNull();
      expect(resNaN.isAvailable).toBe(false);
    });

    it('returns ~25 for 9 followers', () => {
      const res = calculateReach(9);
      expect(res.score).toBe(25);
    });

    it('returns ~50 for 99 followers', () => {
      const res = calculateReach(99);
      expect(res.score).toBe(50);
    });

    it('returns 100 for 10,000 followers', () => {
      const res = calculateReach(10000);
      expect(res.score).toBe(100);
    });

    it('caps at 100 for very large follower counts', () => {
      const res = calculateReach(1000000);
      expect(res.score).toBe(100);
    });
  });

  describe('Impact: min(100, 20 * log10(totalStars + 1))', () => {
    it('returns 0 for 0 stars', () => {
      const res = calculateImpact(0, 5, 5);
      expect(res.score).toBe(0);
      expect(res.raw).toBe(0);
    });

    it('returns ~20 for 9 stars', () => {
      const res = calculateImpact(9, 5, 5);
      expect(res.score).toBe(20);
    });

    it('returns 100 for 100,000 stars', () => {
      const res = calculateImpact(100000, 10, 10);
      expect(res.score).toBe(100);
    });

    it('caps at 100 for excessive stars', () => {
      const res = calculateImpact(500000, 20, 20);
      expect(res.score).toBe(100);
    });

    it('includes quality label when public repos exceed analyzed sample', () => {
      const res = calculateImpact(500, 100, 240);
      expect(res.qualityLabel).toContain('100 most recently active of 240 public repos');
    });
  });

  describe('Activity: % of owned repos pushed in last 90 days', () => {
    it('returns score: null and unavailable when developer has 0 owned repos', () => {
      const res = calculateActivity(0, 0);
      expect(res.score).toBeNull();
      expect(res.isAvailable).toBe(false);
      expect(res.raw).toBe('unavailable');
      expect(res.qualityLabel).toContain('unavailable');
    });

    it('returns 100% when all owned repos are recently active', () => {
      const res = calculateActivity(5, 5);
      expect(res.score).toBe(100);
      expect(res.raw).toBe('5/5');
    });

    it('returns correct percentage for partial activity', () => {
      const res = calculateActivity(3, 6);
      expect(res.score).toBe(50);
      expect(res.raw).toBe('3/6');
    });
  });

  describe('Breadth: min(100, distinctLanguages * 15)', () => {
    it('returns 0 for 0 languages', () => {
      const res = calculateBreadth(0);
      expect(res.score).toBe(0);
    });

    it('returns 15 for 1 language', () => {
      const res = calculateBreadth(1);
      expect(res.score).toBe(15);
    });

    it('returns 45 for 3 languages', () => {
      const res = calculateBreadth(3);
      expect(res.score).toBe(45);
    });

    it('returns 100 for 7 or more languages', () => {
      const res7 = calculateBreadth(7);
      expect(res7.score).toBe(100); // 7 * 15 = 105 -> capped at 100

      const res10 = calculateBreadth(10);
      expect(res10.score).toBe(100);
    });
  });

  describe('calculateDeveloperSignals master function', () => {
    const fixedNow = new Date('2026-10-14T10:00:00Z');

    const sampleRepos: RepoData[] = [
      {
        id: '1',
        name: 'viral-app',
        stars: 1000,
        language: 'TypeScript',
        isFork: false,
        pushedAt: '2026-10-01T12:00:00Z', // 13 days ago -> active
      },
      {
        id: '2',
        name: 'python-bot',
        stars: 50,
        language: 'Python',
        isFork: false,
        pushedAt: '2026-09-01T12:00:00Z', // 43 days ago -> active
      },
      {
        id: '3',
        name: 'archived-c-tool',
        stars: 200,
        language: 'C',
        isFork: false,
        pushedAt: '2025-01-01T12:00:00Z', // > 90 days ago -> inactive
      },
      {
        id: '4',
        name: 'forked-popular-repo',
        stars: 50000, // Should be EXCLUDED because isFork = true
        language: 'Rust',
        isFork: true,
        pushedAt: '2026-10-13T12:00:00Z',
      },
      {
        id: '5',
        name: 'docs-repo',
        stars: 10,
        language: null, // Should not count as a distinct language
        isFork: false,
        pushedAt: '2026-10-05T12:00:00Z', // active
      },
    ];

    it('excludes forks from stars, activity, and languages', () => {
      const result = calculateDeveloperSignals(
        {
          followers: 999,
          publicRepos: 5,
          repos: sampleRepos,
        },
        fixedNow
      );

      // Owned repos: 4 (repo 1, 2, 3, 5) - fork repo 4 excluded
      expect(result.summary.totalOwnedRepos).toBe(4);

      // Total stars: 1000 + 50 + 200 + 10 = 1260 (50,000 from fork is ignored)
      expect(result.summary.totalStars).toBe(1260);

      // Active repos in last 90 days: repo 1, 2, 5 = 3 active out of 4 owned repos
      expect(result.summary.activeReposCount).toBe(3);
      expect(result.activity.score).toBe(75); // 3 / 4 * 100 = 75

      // Distinct languages: TypeScript, Python, C (Rust was on fork, null is ignored) -> 3 languages
      expect(result.summary.distinctLanguagesCount).toBe(3);
      expect(result.breadth.score).toBe(45); // 3 * 15 = 45

      // Reach: 999 followers -> 25 * log10(1000) = 25 * 3 = 75
      expect(result.reach.score).toBe(75);
    });

    it('excludes future timestamps from activity calculation', () => {
      const futureRepo: RepoData = {
        id: 'future-1',
        name: 'future-commit',
        stars: 10,
        language: 'TypeScript',
        isFork: false,
        pushedAt: '2026-10-15T00:00:00Z', // 14 hours in future relative to fixedNow
      };

      const result = calculateDeveloperSignals(
        {
          followers: 10,
          publicRepos: 1,
          repos: [futureRepo],
        },
        fixedNow
      );

      expect(result.summary.activeReposCount).toBe(0);
      expect(result.activity.score).toBe(0);
      expect(result.activity.raw).toBe('0/1');
    });

    it('handles exact 90-day boundary dates correctly', () => {
      const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;
      const exact90DaysAgo = new Date(fixedNow.getTime() - NINETY_DAYS_MS).toISOString();
      const ninetyDaysAndOneSecAgo = new Date(fixedNow.getTime() - NINETY_DAYS_MS - 1000).toISOString();

      const boundaryRepos: RepoData[] = [
        {
          id: 'exact-boundary',
          name: 'exact-repo',
          stars: 5,
          language: 'Go',
          isFork: false,
          pushedAt: exact90DaysAgo, // Exactly 90 days ago -> should count
        },
        {
          id: 'past-boundary',
          name: 'past-repo',
          stars: 5,
          language: 'Go',
          isFork: false,
          pushedAt: ninetyDaysAndOneSecAgo, // 90 days + 1 sec -> should NOT count
        },
      ];

      const result = calculateDeveloperSignals(
        {
          followers: 10,
          publicRepos: 2,
          repos: boundaryRepos,
        },
        fixedNow
      );

      expect(result.summary.activeReposCount).toBe(1);
      expect(result.activity.score).toBe(50);
      expect(result.activity.raw).toBe('1/2');
    });

    it('handles invalid date strings, nulls, and missing pushedAt safely without throwing', () => {
      const malformedRepos: RepoData[] = [
        {
          id: 'invalid-date',
          name: 'bad-date',
          stars: 2,
          language: 'JavaScript',
          isFork: false,
          pushedAt: 'not-a-valid-date-string',
        },
        {
          id: 'null-date',
          name: 'null-date',
          stars: 2,
          language: 'JavaScript',
          isFork: false,
          pushedAt: null,
        },
      ];

      const result = calculateDeveloperSignals(
        {
          followers: 10,
          publicRepos: 2,
          repos: malformedRepos,
        },
        fixedNow
      );

      expect(result.summary.activeReposCount).toBe(0);
      expect(result.activity.score).toBe(0);
      expect(result.activity.raw).toBe('0/2');
    });

    it('handles empty repositories array cleanly with accurate data quality labels', () => {
      const result = calculateDeveloperSignals(
        {
          followers: 0,
          publicRepos: 0,
          repos: [],
        },
        fixedNow
      );

      expect(result.summary.totalOwnedRepos).toBe(0);
      expect(result.summary.totalStars).toBe(0);
      expect(result.summary.activeReposCount).toBe(0);
      expect(result.summary.distinctLanguagesCount).toBe(0);
      expect(result.reach.isAvailable).toBe(false);
      expect(result.reach.raw).toBe('unavailable');
      expect(result.reach.score).toBeNull();
      expect(result.impact.isAvailable).toBe(false);
      expect(result.impact.raw).toBe('unavailable');
      expect(result.impact.score).toBeNull();
      expect(result.activity.isAvailable).toBe(false);
      expect(result.activity.raw).toBe('unavailable');
      expect(result.activity.score).toBeNull();
      expect(result.breadth.isAvailable).toBe(false);
      expect(result.breadth.raw).toBe('unavailable');
      expect(result.breadth.score).toBeNull();
      expect(result.summary.dataQualityNote).toBe('No public repositories found to analyze');
    });
  });
});
