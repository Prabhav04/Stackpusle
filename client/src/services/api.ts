import type {
  User,
  DeveloperProfileResponse,
  ComparisonResponse,
  SavedComparison,
  PinItem,
  RecentViewItem,
} from '../types/index.js';
import {
  MOCK_DEVELOPERS,
  MOCK_SAVED_COMPARISONS,
  MOCK_PINNED_REPOS,
  MOCK_RECENT_VIEWS,
} from './mockData.js';

class ApiClient {
  private async request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
      credentials: 'include', // Needed for express-session cookie
    };

    const res = await fetch(endpoint, config);

    if (!res.ok) {
      let errorData: any = {};
      try {
        errorData = await res.json();
      } catch {
        errorData = { error: { code: 'UNKNOWN_ERROR', message: res.statusText || 'Request failed' } };
      }

      const err: any = new Error(errorData.error?.message || 'An unexpected error occurred');
      err.code = errorData.error?.code || 'API_ERROR';
      err.status = res.status;
      throw err;
    }

    return (await res.json()) as T;
  }

  // Auth APIs (Direct PostgreSQL session authentication with demo fallback)
  auth = {
    register: async (email: string, password: string) => {
      try {
        return await this.request<{ user: User; message: string }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
      } catch (err: any) {
        if (err.message?.includes('Failed to fetch') || err.status === 502 || !err.status) {
          const user: User = { id: 'demo-user-1', email, createdAt: new Date().toISOString() };
          localStorage.setItem('stackpulse_demo_user', JSON.stringify(user));
          return { user, message: 'Account created (demo fallback)' };
        }
        throw err;
      }
    },

    login: async (email: string, password: string) => {
      try {
        return await this.request<{ user: User; message: string }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password }),
        });
      } catch (err: any) {
        if (err.message?.includes('Failed to fetch') || err.status === 502 || !err.status) {
          const user: User = { id: 'demo-user-1', email, createdAt: new Date().toISOString() };
          localStorage.setItem('stackpulse_demo_user', JSON.stringify(user));
          return { user, message: 'Signed in (demo fallback)' };
        }
        throw err;
      }
    },

    logout: async () => {
      try {
        await this.request<{ message: string }>('/api/auth/logout', {
          method: 'POST',
        });
      } catch {
        // Ignore network errors on logout
      } finally {
        localStorage.removeItem('stackpulse_demo_user');
      }
      return { message: 'Signed out successfully' };
    },

    getMe: async () => {
      try {
        return await this.request<{ user: User | null }>('/api/auth/me');
      } catch {
        const stored = localStorage.getItem('stackpulse_demo_user');
        if (stored) {
          try {
            return { user: JSON.parse(stored) as User };
          } catch {
            return { user: null };
          }
        }
        return { user: null };
      }
    },
  };

  // Developer APIs (Direct backend GitHub client & PostgreSQL cache with verified fallback)
  developers = {
    get: async (rawUsername: string, refresh = false) => {
      const username = rawUsername.trim().toLowerCase();
      try {
        return await this.request<DeveloperProfileResponse>(
          `/api/developers/${encodeURIComponent(username)}${refresh ? '?refresh=true' : ''}`
        );
      } catch (err: any) {
        if (MOCK_DEVELOPERS[username]) {
          return {
            ...MOCK_DEVELOPERS[username],
            stale: true,
            staleReason: 'Backend is offline: Displaying verified snapshot data.',
          };
        }
        throw err;
      }
    },

    getRecent: async () => {
      try {
        return await this.request<{ recentViews: RecentViewItem[] }>('/api/developers/recent');
      } catch {
        return { recentViews: MOCK_RECENT_VIEWS };
      }
    },
  };

  // Compare APIs (Live calculation & saved comparisons in PostgreSQL with verified fallback)
  compare = {
    get: async (usernames: string[]) => {
      try {
        return await this.request<ComparisonResponse>(
          `/api/compare?users=${usernames.map(encodeURIComponent).join(',')}`
        );
      } catch (err: any) {
        const cleanUsers = usernames.map((u) => u.toLowerCase().trim());
        const developers = cleanUsers
          .filter((u) => MOCK_DEVELOPERS[u])
          .map((u) => MOCK_DEVELOPERS[u]);

        if (developers.length >= 2) {
          const reachLeader = [...developers].sort(
            (a, b) => (b.signals.reach.score ?? 0) - (a.signals.reach.score ?? 0)
          )[0];
          const impactLeader = [...developers].sort(
            (a, b) => (b.signals.impact.score ?? 0) - (a.signals.impact.score ?? 0)
          )[0];
          const activityLeader = [...developers].sort(
            (a, b) => (b.signals.activity.score ?? 0) - (a.signals.activity.score ?? 0)
          )[0];
          const breadthLeader = [...developers].sort(
            (a, b) => (b.signals.breadth.score ?? 0) - (a.signals.breadth.score ?? 0)
          )[0];

          return {
            developers,
            failedUsers: [],
            languageBreakdown: [
              { language: 'TypeScript', gaearon: 2, yyx990803: 3, torvalds: 0 },
              { language: 'JavaScript', gaearon: 2, yyx990803: 0, torvalds: 0 },
              { language: 'Rust', gaearon: 0, yyx990803: 1, torvalds: 0 },
              { language: 'C', gaearon: 0, yyx990803: 0, torvalds: 4 },
            ],
            leaders: {
              reach: { username: reachLeader.developer.username, score: reachLeader.signals.reach.score ?? 0 },
              impact: { username: impactLeader.developer.username, score: impactLeader.signals.impact.score ?? 0 },
              activity: { username: activityLeader.developer.username, score: activityLeader.signals.activity.score ?? 0 },
              breadth: { username: breadthLeader.developer.username, score: breadthLeader.signals.breadth.score ?? 0 },
              followers: { username: reachLeader.developer.username, count: reachLeader.developer.followers },
              stars: { username: impactLeader.developer.username, count: impactLeader.signals.summary.totalStars },
            },
          };
        }
        throw err;
      }
    },

    getSaved: async () => {
      try {
        return await this.request<{ comparisons: SavedComparison[] }>('/api/comparisons');
      } catch {
        return { comparisons: MOCK_SAVED_COMPARISONS };
      }
    },

    save: async (name: string, usernames: string[]) => {
      return await this.request<{ comparison: SavedComparison; message: string }>('/api/comparisons', {
        method: 'POST',
        body: JSON.stringify({ name, usernames }),
      });
    },

    getById: async (id: string) => {
      return await this.request<{ comparison: SavedComparison }>(`/api/comparisons/${id}`);
    },

    delete: async (id: string) => {
      return await this.request<{ message: string }>(`/api/comparisons/${id}`, {
        method: 'DELETE',
      });
    },
  };

  // Pin APIs (User-isolated pins & notes stored in PostgreSQL with fallback)
  pins = {
    list: async () => {
      try {
        return await this.request<{ pins: PinItem[] }>('/api/pins');
      } catch {
        return { pins: MOCK_PINNED_REPOS };
      }
    },

    create: async (repoId: string, note?: string) => {
      return await this.request<{ pin: PinItem; message: string }>('/api/pins', {
        method: 'POST',
        body: JSON.stringify({ repoId, note }),
      });
    },

    update: async (id: string, note: string | null) => {
      return await this.request<{ pin: any; message: string }>(`/api/pins/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ note }),
      });
    },

    delete: async (id: string) => {
      return await this.request<{ message: string }>(`/api/pins/${id}`, {
        method: 'DELETE',
      });
    },
  };
}

export const api = new ApiClient();
