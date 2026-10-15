export interface RepoData {
  id: string;
  name: string;
  stars: number;
  language: string | null;
  isFork: boolean;
  pushedAt: string | Date | null;
}

export interface DeveloperSignalsInput {
  followers: number;
  publicRepos: number;
  repos: RepoData[];
}

export interface SignalScoreDetail {
  score: number | null;
  isAvailable: boolean;
  raw: number | string;
  formula: string;
  description: string;
  qualityLabel: string;
}

export interface SignalScoresResult {
  reach: SignalScoreDetail;
  impact: SignalScoreDetail;
  activity: SignalScoreDetail;
  breadth: SignalScoreDetail;
  summary: {
    totalOwnedRepos: number;
    totalStars: number;
    distinctLanguagesCount: number;
    activeReposCount: number;
    dataQualityNote: string;
  };
}

const NINETY_DAYS_MS = 90 * 24 * 60 * 60 * 1000;

/**
 * Calculates Reach Signal Score (0-100)
 * Formula: min(100, 25 * log10(followers + 1))
 * Edge case: 0 followers or invalid returns unavailable
 */
export function calculateReach(followers: number): SignalScoreDetail {
  if (followers === null || followers === undefined || isNaN(followers) || followers <= 0) {
    return {
      score: null,
      isAvailable: false,
      raw: 'unavailable',
      formula: 'min(100, 25 × log10(followers + 1))',
      description: 'Audience size indicator (10,000 followers = 100)',
      qualityLabel: 'No public followers recorded — reach indicator is unavailable',
    };
  }

  const safeFollowers = Math.max(0, followers);
  const score = Math.min(100, Math.round(25 * Math.log10(safeFollowers + 1)));

  return {
    score,
    isAvailable: true,
    raw: safeFollowers,
    formula: 'min(100, 25 × log10(followers + 1))',
    description: 'Audience size indicator (10,000 followers = 100)',
    qualityLabel: 'Based on public GitHub follower count',
  };
}

/**
 * Calculates Impact Signal Score (0-100)
 * Formula: min(100, 20 * log10(totalStars + 1)) on owned (non-fork) repos
 */
export function calculateImpact(
  totalStars: number,
  analyzedReposCount: number,
  totalPublicRepos: number
): SignalScoreDetail {
  if (analyzedReposCount === 0) {
    return {
      score: null,
      isAvailable: false,
      raw: 'unavailable',
      formula: 'min(100, 20 × log10(totalStars + 1))',
      description: 'Recognition of owned repos (100,000 stars = 100)',
      qualityLabel: 'No owned repositories found to evaluate impact (unavailable)',
    };
  }

  const safeStars = Math.max(0, totalStars || 0);
  const score = Math.min(100, Math.round(20 * Math.log10(safeStars + 1)));

  const qualityLabel =
    totalPublicRepos > analyzedReposCount
      ? `Based on ${analyzedReposCount} most recently active of ${totalPublicRepos} public repos (excluding forks)`
      : `Based on ${analyzedReposCount} owned repos (excluding forks)`;

  return {
    score,
    isAvailable: true,
    raw: safeStars,
    formula: 'min(100, 20 × log10(totalStars + 1))',
    description: 'Recognition of owned repos (100,000 stars = 100)',
    qualityLabel,
  };
}

/**
 * Calculates Activity Signal Score (0-100)
 * Formula: % of owned repos pushed in the last 90 days
 */
export function calculateActivity(
  activeReposCount: number,
  totalOwnedRepos: number
): SignalScoreDetail {
  if (totalOwnedRepos === 0) {
    return {
      score: null,
      isAvailable: false,
      raw: 'unavailable',
      formula: '% of owned repos pushed in last 90 days',
      description: 'Is the developer actively shipping code recently',
      qualityLabel: 'No owned repositories found — activity metric is unavailable',
    };
  }

  const percentage = (activeReposCount / totalOwnedRepos) * 100;
  const score = Math.min(100, Math.max(0, Math.round(percentage)));

  return {
    score,
    isAvailable: true,
    raw: `${activeReposCount}/${totalOwnedRepos}`,
    formula: '% of owned repos pushed in last 90 days',
    description: 'Is the developer actively shipping code recently',
    qualityLabel: `${activeReposCount} of ${totalOwnedRepos} owned repos pushed in last 90 days`,
  };
}

/**
 * Calculates Breadth Signal Score (0-100)
 * Formula: min(100, distinctLanguages * 15)
 */
export function calculateBreadth(
  distinctLanguagesCount: number,
  totalOwnedRepos: number = 1
): SignalScoreDetail {
  if (totalOwnedRepos === 0) {
    return {
      score: null,
      isAvailable: false,
      raw: 'unavailable',
      formula: 'min(100, distinctLanguages × 15)',
      description: 'Range of languages used across owned repos (7+ = 100)',
      qualityLabel: 'No owned repositories found to assess language breadth (unavailable)',
    };
  }

  const score = Math.min(100, distinctLanguagesCount * 15);

  return {
    score,
    isAvailable: true,
    raw: distinctLanguagesCount,
    formula: 'min(100, distinctLanguages × 15)',
    description: 'Range of languages used across owned repos (7+ = 100)',
    qualityLabel: 'Primary language per repository count (excluding forks)',
  };
}

/**
 * Master function to compute all Signal Scores for a developer
 */
export function calculateDeveloperSignals(
  input: DeveloperSignalsInput,
  referenceDate: Date = new Date()
): SignalScoresResult {
  const { followers, publicRepos, repos } = input;

  // Forks are strictly excluded from all repo-based metrics as per PRD Section 6
  const ownedRepos = (repos || []).filter((r) => !r.isFork);

  // Total stars from owned repos
  const totalStars = ownedRepos.reduce((acc, r) => acc + (r.stars || 0), 0);

  // Active repos in last 90 days (excluding future dates and handling invalid/missing timestamps)
  const nowMs = referenceDate instanceof Date && !isNaN(referenceDate.getTime())
    ? referenceDate.getTime()
    : Date.now();

  const activeReposCount = ownedRepos.filter((r) => {
    if (!r.pushedAt) return false;
    const pushedDate = new Date(r.pushedAt);
    const pushedMs = pushedDate.getTime();
    if (isNaN(pushedMs)) return false;
    // Must be pushed on or before reference date (not in future) and within 90 days
    return pushedMs <= nowMs && (nowMs - pushedMs) <= NINETY_DAYS_MS;
  }).length;

  // Distinct primary languages (ignoring null or empty strings)
  const languageSet = new Set<string>();
  ownedRepos.forEach((r) => {
    if (r.language && r.language.trim()) {
      languageSet.add(r.language.trim());
    }
  });
  const distinctLanguagesCount = languageSet.size;

  const totalAnalyzed = (repos || []).length;
  const dataQualityNote =
    totalAnalyzed === 0
      ? 'No public repositories found to analyze'
      : publicRepos > totalAnalyzed
      ? `Metrics based on sample of ${totalAnalyzed} most recently active of ${publicRepos} public repos (excluding forks)`
      : `Complete sample of ${totalAnalyzed} repos analyzed (excluding forks)`;

  return {
    reach: calculateReach(followers),
    impact: calculateImpact(totalStars, ownedRepos.length, publicRepos),
    activity: calculateActivity(activeReposCount, ownedRepos.length),
    breadth: calculateBreadth(distinctLanguagesCount, ownedRepos.length),
    summary: {
      totalOwnedRepos: ownedRepos.length,
      totalStars,
      distinctLanguagesCount,
      activeReposCount,
      dataQualityNote,
    },
  };
}
