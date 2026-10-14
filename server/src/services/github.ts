import { prisma } from '../config/prisma.js';
import { env } from '../config/env.js';
import {
  UserNotFoundError,
  RateLimitedError,
  GitHubUnavailableError,
} from '../utils/errors.js';
import { calculateDeveloperSignals, SignalScoresResult } from './signals.js';

const FIFTEEN_MINUTES_MS = 15 * 60 * 1000;

export interface GitHubUserProfile {
  login: string;
  name: string | null;
  avatar_url: string;
  bio: string | null;
  followers: number;
  public_repos: number;
}

export interface GitHubRepoItem {
  id: number;
  name: string;
  html_url: string;
  description: string | null;
  stargazers_count: number;
  language: string | null;
  fork: boolean;
  pushed_at: string | null;
}

export interface DeveloperWithDetails {
  developer: {
    id: string;
    username: string;
    name: string | null;
    avatarUrl: string | null;
    bio: string | null;
    followers: number;
    publicRepos: number;
    fetchedAt: Date;
  };
  repos: {
    id: string;
    githubId: string;
    name: string;
    url: string;
    description: string | null;
    stars: number;
    language: string | null;
    isFork: boolean;
    pushedAt: Date | null;
  }[];
  signals: SignalScoresResult;
  stale: boolean;
  staleReason?: string;
  cached: boolean;
}

/**
 * Fetch with timeout and GitHub-compatible headers
 */
async function fetchFromGitHub<T>(url: string): Promise<T> {
  const headers: Record<string, string> = {
    Accept: 'application/vnd.github.v3+json',
    'User-Agent': 'StackPulse-App/1.0',
  };

  if (env.GITHUB_TOKEN) {
    headers.Authorization = `Bearer ${env.GITHUB_TOKEN}`;
  }

  let response: globalThis.Response;
  try {
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 10000); // 10s timeout

    response = await fetch(url, {
      headers,
      signal: controller.signal,
    });
    clearTimeout(timeoutId);
  } catch (err: unknown) {
    throw new GitHubUnavailableError('Failed to communicate with GitHub API (network timeout or unreachable)');
  }

  if (response.status === 404) {
    throw new UserNotFoundError(url.split('/').pop() || 'unknown');
  }

  if (response.status === 403 || response.status === 429) {
    const remaining = response.headers.get('x-ratelimit-remaining');
    const reset = response.headers.get('x-ratelimit-reset');
    const resetTime = reset ? new Date(parseInt(reset, 10) * 1000).toLocaleTimeString() : 'soon';
    throw new RateLimitedError(
      `GitHub API rate limit exceeded (${remaining ?? 0} remaining). Resets at ${resetTime}. Configure GITHUB_TOKEN to increase limits.`
    );
  }

  if (!response.ok) {
    throw new GitHubUnavailableError(`GitHub returned HTTP ${response.status}: ${response.statusText}`);
  }

  return (await response.json()) as T;
}

/**
 * Format database developer record with BigInt handling and Signal Scores
 */
function formatDeveloperResponse(
  developer: any,
  stale = false,
  staleReason?: string,
  cached = true
): DeveloperWithDetails {
  const formattedRepos = (developer.repos || []).map((r: any) => ({
    id: r.id,
    githubId: r.githubId.toString(),
    name: r.name,
    url: r.url,
    description: r.description,
    stars: r.stars,
    language: r.language,
    isFork: r.isFork,
    pushedAt: r.pushedAt ? new Date(r.pushedAt) : null,
  }));

  const signals = calculateDeveloperSignals({
    followers: developer.followers,
    publicRepos: developer.publicRepos,
    repos: formattedRepos,
  });

  return {
    developer: {
      id: developer.id,
      username: developer.username,
      name: developer.name,
      avatarUrl: developer.avatarUrl,
      bio: developer.bio,
      followers: developer.followers,
      publicRepos: developer.publicRepos,
      fetchedAt: developer.fetchedAt,
    },
    repos: formattedRepos,
    signals,
    stale,
    staleReason,
    cached,
  };
}

const GITHUB_USERNAME_REGEX = /^[a-z0-9](?:[a-z0-9]|-(?=[a-z0-9])){0,38}$/;

export function isValidGitHubUsername(username: string): boolean {
  return GITHUB_USERNAME_REGEX.test(username);
}

/**
 * Get developer profile, repos and Signal Scores with 15-minute caching and stale fallback
 */
export async function getDeveloperProfile(
  rawUsername: string,
  options: { forceRefresh?: boolean } = {}
): Promise<DeveloperWithDetails> {
  const username = rawUsername.trim().toLowerCase();

  if (!username) {
    throw new UserNotFoundError('Username is required');
  }

  if (!GITHUB_USERNAME_REGEX.test(username)) {
    throw new UserNotFoundError(
      `Invalid GitHub username format: "${username}". GitHub usernames can only contain alphanumeric characters or single hyphens and cannot begin or end with a hyphen.`
    );
  }

  // 1. Check existing database record
  let existing: any = null;
  try {
    existing = await prisma.developer.findUnique({
      where: { username },
      include: {
        repos: {
          orderBy: [{ stars: 'desc' }, { pushedAt: 'desc' }],
        },
      },
    });
  } catch (dbErr) {
    console.warn('Database query failed or not ready:', dbErr);
  }

  const nowMs = Date.now();
  const isFresh =
    existing &&
    !options.forceRefresh &&
    nowMs - new Date(existing.fetchedAt).getTime() < FIFTEEN_MINUTES_MS;

  if (isFresh) {
    return formatDeveloperResponse(existing, false, undefined, true);
  }

  // 2. Need to fetch fresh data from GitHub
  try {
    const userUrl = `https://api.github.com/users/${encodeURIComponent(username)}`;
    const reposUrl = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=100&sort=pushed`;

    const [ghUser, ghRepos] = await Promise.all([
      fetchFromGitHub<GitHubUserProfile>(userUrl),
      fetchFromGitHub<GitHubRepoItem[]>(reposUrl),
    ]);

    // 3. Upsert into database
    const savedDeveloper = await prisma.$transaction(async (tx) => {
      const dev = await tx.developer.upsert({
        where: { username },
        create: {
          username: ghUser.login.toLowerCase(),
          name: ghUser.name,
          avatarUrl: ghUser.avatar_url,
          bio: ghUser.bio,
          followers: ghUser.followers,
          publicRepos: ghUser.public_repos,
          fetchedAt: new Date(),
        },
        update: {
          name: ghUser.name,
          avatarUrl: ghUser.avatar_url,
          bio: ghUser.bio,
          followers: ghUser.followers,
          publicRepos: ghUser.public_repos,
          fetchedAt: new Date(),
        },
      });

      // Clear previous repos to ensure synchronicity with the latest fetched page
      await tx.repo.deleteMany({
        where: { developerId: dev.id },
      });

      // Batch create repos
      if (ghRepos.length > 0) {
        await tx.repo.createMany({
          data: ghRepos.map((r) => ({
            developerId: dev.id,
            githubId: BigInt(r.id),
            name: r.name,
            url: r.html_url,
            description: r.description,
            stars: r.stargazers_count,
            language: r.language,
            isFork: r.fork,
            pushedAt: r.pushed_at ? new Date(r.pushed_at) : null,
          })),
        });
      }

      return tx.developer.findUnique({
        where: { id: dev.id },
        include: {
          repos: {
            orderBy: [{ stars: 'desc' }, { pushedAt: 'desc' }],
          },
        },
      });
    });

    return formatDeveloperResponse(savedDeveloper, false, undefined, false);
  } catch (err: any) {
    // 4. Stale fallback logic:
    // If GitHub fails (rate limit, outage, or network), and we have a stale database copy, return it with stale: true
    if (existing) {
      const reason =
        err instanceof RateLimitedError
          ? 'Showing cached data: GitHub API rate limit reached.'
          : 'Showing cached data: GitHub API is currently unreachable.';

      return formatDeveloperResponse(existing, true, reason, true);
    }

    // No cache exists to fall back on; rethrow original error
    throw err;
  }
}
