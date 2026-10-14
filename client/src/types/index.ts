export interface User {
  id: string;
  email: string;
  createdAt: string;
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

export interface Developer {
  id: string;
  username: string;
  name: string | null;
  avatarUrl: string | null;
  bio: string | null;
  followers: number;
  publicRepos: number;
  fetchedAt: string;
}

export interface Repo {
  id: string;
  githubId: string;
  name: string;
  url: string;
  description: string | null;
  stars: number;
  language: string | null;
  isFork: boolean;
  pushedAt: string | null;
  isPinned?: boolean;
  pinId?: string | null;
  pinNote?: string | null;
  developer?: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
  };
}

export interface DeveloperProfileResponse {
  developer: Developer;
  repos: Repo[];
  signals: SignalScoresResult;
  stale: boolean;
  staleReason?: string;
  cached: boolean;
}

export interface ComparisonResponse {
  developers: DeveloperProfileResponse[];
  failedUsers: { username: string; error: string; code?: string }[];
  languageBreakdown: Record<string, any>[];
  leaders: {
    reach: { username: string; score: number };
    impact: { username: string; score: number };
    activity: { username: string; score: number };
    breadth: { username: string; score: number };
    followers: { username: string; count: number };
    stars: { username: string; count: number };
  };
  isSaved?: boolean;
  savedComparisonId?: string | null;
  savedComparisonName?: string | null;
}

export interface SavedComparison {
  id: string;
  name: string;
  createdAt: string;
  usernames: string[];
  developers: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
    followers: number;
  }[];
}

export interface PinItem {
  id: string;
  note: string | null;
  createdAt: string;
  repo: Repo;
}

export interface RecentViewItem {
  developer: Developer;
  viewedAt: string;
}

export interface ApiErrorResponse {
  error: {
    code: string;
    message: string;
  };
}
