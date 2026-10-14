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
  score: number;
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
 */
export function calculateReach(followers: number): SignalScoreDetail {
  const safeFollowers = Math.max(0, followers || 0);
  const score = Math.min(100, Math.round(25 * Math.log10(safeFollowers + 1)));

  return {
    score,
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
  const safeStars = Math.max(0, totalStars || 0);
  const score = Math.min(100, Math.round(20 * Math.log10(safeStars + 1)));

  const qualityLabel =
    totalPublicRepos > analyzedReposCount
      ? `Based on first ${analyzedReposCount} of ${totalPublicRepos} public repos (excluding forks)`
      : `Based on ${analyzedReposCount} owned repos (excluding forks)`;

  return {
    score,
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
      score: 0,
      raw: '0/0',
      formula: '% of owned repos pushed in last 90 days',
      description: 'Is the developer actively shipping code recently',
      qualityLabel: 'No owned repositories found to assess recent push activity',
    };
  }

  const percentage = (activeReposCount / totalOwnedRepos) * 100;
  const score = Math.min(100, Math.max(0, Math.round(percentage)));

  return {
    score,
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
  distinctLanguagesCount: number
): SignalScoreDetail {
  const score = Math.min(100, distinctLanguagesCount * 15);

  return {
    score,
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

  // Active repos in last 90 days
  const nowMs = referenceDate.getTime();
  const activeReposCount = ownedRepos.filter((r) => {
    if (!r.pushedAt) return false;
    const pushedMs = new Date(r.pushedAt).getTime();
    return !isNaN(pushedMs) && nowMs - pushedMs <= NINETY_DAYS_MS;
  }).length;

  // Distinct primary languages (ignoring null or empty strings)
  const languageSet = new Set<string>();
  ownedRepos.forEach((r) => {
    if (r.language && r.language.trim()) {
      languageSet.add(r.language.trim());
    }
  });
  const distinctLanguagesCount = languageSet.size;

  const dataQualityNote =
    publicRepos > repos.length
      ? `Metrics based on sample of ${repos.length} of ${publicRepos} public repos`
      : `Complete sample of ${repos.length} repos analyzed`;

  return {
    reach: calculateReach(followers),
    impact: calculateImpact(totalStars, ownedRepos.length, publicRepos),
    activity: calculateActivity(activeReposCount, ownedRepos.length),
    breadth: calculateBreadth(distinctLanguagesCount),
    summary: {
      totalOwnedRepos: ownedRepos.length,
      totalStars,
      distinctLanguagesCount,
      activeReposCount,
      dataQualityNote,
    },
  };
}
