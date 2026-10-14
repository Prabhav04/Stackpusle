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
      credentials: 'include',
    };

    try {
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
    } catch (networkErr: any) {
      // If network error (backend server offline), fall back to demo mode seamlessly
      throw networkErr;
    }
  }

  // Auth APIs
  auth = {
    register: async (email: string, _password: string) => {
      try {
        return await this.request<{ user: User; message: string }>('/api/auth/register', {
          method: 'POST',
          body: JSON.stringify({ email, password: _password }),
        });
      } catch {
        const user: User = { id: 'demo-user-1', email, createdAt: new Date().toISOString() };
        localStorage.setItem('stackpulse_demo_user', JSON.stringify(user));
        return { user, message: 'Account created successfully (Demo Mode)' };
      }
    },

    login: async (email: string, _password: string) => {
      try {
        return await this.request<{ user: User; message: string }>('/api/auth/login', {
          method: 'POST',
          body: JSON.stringify({ email, password: _password }),
        });
      } catch {
        const user: User = { id: 'demo-user-1', email, createdAt: new Date().toISOString() };
        localStorage.setItem('stackpulse_demo_user', JSON.stringify(user));
        return { user, message: 'Signed in successfully (Demo Mode)' };
      }
    },

    logout: async () => {
      sessionStorage.setItem('stackpulse_explicit_logout', 'true');
      try {
        await this.request<{ message: string }>('/api/auth/logout', { method: 'POST' });
      } catch {
        // demo fallback
      } finally {
        localStorage.removeItem('stackpulse_demo_user');
      }
      return { message: 'Signed out successfully' };
    },

    getMe: async () => {
      try {
        const res = await this.request<{ user: User | null }>('/api/auth/me');
        if (res.user) return res;
      } catch {
        // backend offline
      }

      const explicitLogout = sessionStorage.getItem('stackpulse_explicit_logout');
      if (explicitLogout) {
        return { user: null };
      }

      const stored = localStorage.getItem('stackpulse_demo_user');
      if (stored) {
        return { user: JSON.parse(stored) };
      }

      const defaultUser: User = {
        id: 'demo-user-1',
        email: 'demo@stackpulse.dev',
        createdAt: new Date().toISOString(),
      };
      localStorage.setItem('stackpulse_demo_user', JSON.stringify(defaultUser));
      return { user: defaultUser };
    },
  };

  // Developer APIs
  developers = {
    get: async (rawUsername: string, refresh = false) => {
      const username = rawUsername.trim().toLowerCase();
      try {
        return await this.request<DeveloperProfileResponse>(
          `/api/developers/${encodeURIComponent(username)}${refresh ? '?refresh=true' : ''}`
        );
      } catch (err: any) {
        // If the backend actively responded with a specific domain error, propagate it
        if (
          err.code === 'USER_NOT_FOUND' ||
          err.code === 'RATE_LIMITED' ||
          err.code === 'GITHUB_UNAVAILABLE' ||
          err.code === 'UNAUTHENTICATED' ||
          err.code === 'VALIDATION_ERROR'
        ) {
          throw err;
        }

        // Only use mock fallback if network / connection failed
        if (MOCK_DEVELOPERS[username]) {
          return MOCK_DEVELOPERS[username];
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

  // Compare APIs
  compare = {
    get: async (usernames: string[]) => {
      try {
        return await this.request<ComparisonResponse>(
          `/api/compare?users=${usernames.map(encodeURIComponent).join(',')}`
        );
      } catch (err: any) {
        if (
          err.code === 'VALIDATION_ERROR' ||
          err.code === 'RATE_LIMITED' ||
          err.code === 'GITHUB_UNAVAILABLE' ||
          err.code === 'UNAUTHENTICATED'
        ) {
          throw err;
        }

        // Demo comparison calculation
        const cleanUsers = usernames.map((u) => u.trim().toLowerCase());
        const profiles = cleanUsers
          .map((u) => MOCK_DEVELOPERS[u])
          .filter(Boolean);

        if (profiles.length < 2) {
          const err: any = new Error('Please select at least 2 valid demo developers (e.g. gaearon, yyx990803, torvalds)');
          err.code = 'VALIDATION_ERROR';
          throw err;
        }

        // Language comparison breakdown
        const allLanguages = new Set<string>();
        const developerLanguageCounts = profiles.map((p) => {
          const counts: Record<string, number> = {};
          p.repos.filter((r) => !r.isFork).forEach((r) => {
            if (r.language) {
              counts[r.language] = (counts[r.language] || 0) + 1;
              allLanguages.add(r.language);
            }
          });
          return { username: p.developer.username, counts };
        });

        const languageBreakdown = Array.from(allLanguages).map((lang) => {
          const row: Record<string, any> = { language: lang };
          developerLanguageCounts.forEach((d) => {
            row[d.username] = d.counts[lang] || 0;
          });
          return row;
        });

        const leaders = {
          reach: profiles.reduce((max, p) => (p.signals.reach.score > max.score ? { username: p.developer.username, score: p.signals.reach.score } : max), { username: '', score: -1 }),
          impact: profiles.reduce((max, p) => (p.signals.impact.score > max.score ? { username: p.developer.username, score: p.signals.impact.score } : max), { username: '', score: -1 }),
          activity: profiles.reduce((max, p) => (p.signals.activity.score > max.score ? { username: p.developer.username, score: p.signals.activity.score } : max), { username: '', score: -1 }),
          breadth: profiles.reduce((max, p) => (p.signals.breadth.score > max.score ? { username: p.developer.username, score: p.signals.breadth.score } : max), { username: '', score: -1 }),
          followers: profiles.reduce((max, p) => (p.developer.followers > max.count ? { username: p.developer.username, count: p.developer.followers } : max), { username: '', count: -1 }),
          stars: profiles.reduce((max, p) => (p.signals.summary.totalStars > max.count ? { username: p.developer.username, count: p.signals.summary.totalStars } : max), { username: '', count: -1 }),
        };

        return {
          developers: profiles,
          failedUsers: [],
          languageBreakdown,
          leaders,
        };
      }
    },

    getSaved: async () => {
      try {
        return await this.request<{ comparisons: SavedComparison[] }>('/api/comparisons');
      } catch {
        const stored = localStorage.getItem('stackpulse_saved_comparisons');
        return { comparisons: stored ? JSON.parse(stored) : MOCK_SAVED_COMPARISONS };
      }
    },

    save: async (name: string, usernames: string[]) => {
      try {
        return await this.request<{ comparison: SavedComparison; message: string }>('/api/comparisons', {
          method: 'POST',
          body: JSON.stringify({ name, usernames }),
        });
      } catch {
        const existing = localStorage.getItem('stackpulse_saved_comparisons');
        const list: SavedComparison[] = existing ? JSON.parse(existing) : [...MOCK_SAVED_COMPARISONS];
        const newComp: SavedComparison = {
          id: `comp-${Date.now()}`,
          name,
          createdAt: new Date().toISOString(),
          usernames,
          developers: usernames.map((u) => ({
            id: `dev-${u}`,
            username: u,
            name: MOCK_DEVELOPERS[u]?.developer.name || u,
            avatarUrl: MOCK_DEVELOPERS[u]?.developer.avatarUrl || 'https://github.com/identicons/stackpulse.png',
            followers: MOCK_DEVELOPERS[u]?.developer.followers || 0,
          })),
        };
        list.unshift(newComp);
        localStorage.setItem('stackpulse_saved_comparisons', JSON.stringify(list));
        return { comparison: newComp, message: 'Comparison saved successfully' };
      }
    },

    getById: async (id: string) => {
      try {
        return await this.request<{ comparison: SavedComparison }>(`/api/comparisons/${id}`);
      } catch {
        const stored = localStorage.getItem('stackpulse_saved_comparisons');
        const list: SavedComparison[] = stored ? JSON.parse(stored) : MOCK_SAVED_COMPARISONS;
        const found = list.find((c) => c.id === id);
        if (!found) throw new Error('Comparison not found');
        return { comparison: found };
      }
    },

    delete: async (id: string) => {
      try {
        return await this.request<{ message: string }>(`/api/comparisons/${id}`, { method: 'DELETE' });
      } catch {
        const stored = localStorage.getItem('stackpulse_saved_comparisons');
        const list: SavedComparison[] = stored ? JSON.parse(stored) : MOCK_SAVED_COMPARISONS;
        const updated = list.filter((c) => c.id !== id);
        localStorage.setItem('stackpulse_saved_comparisons', JSON.stringify(updated));
        return { message: 'Comparison deleted successfully' };
      }
    },
  };

  // Pin APIs
  pins = {
    list: async () => {
      try {
        return await this.request<{ pins: PinItem[] }>('/api/pins');
      } catch {
        const stored = localStorage.getItem('stackpulse_pinned_repos');
        return { pins: stored ? JSON.parse(stored) : MOCK_PINNED_REPOS };
      }
    },

    create: async (repoId: string, note?: string) => {
      try {
        return await this.request<{ pin: PinItem; message: string }>('/api/pins', {
          method: 'POST',
          body: JSON.stringify({ repoId, note }),
        });
      } catch {
        const stored = localStorage.getItem('stackpulse_pinned_repos');
        const list: PinItem[] = stored ? JSON.parse(stored) : [...MOCK_PINNED_REPOS];
        
        // Find repo from mock data
        let foundRepo: any = null;
        for (const dev of Object.values(MOCK_DEVELOPERS)) {
          const r = dev.repos.find((item) => item.id === repoId);
          if (r) {
            foundRepo = { ...r, developer: dev.developer };
            break;
          }
        }

        const newPin: PinItem = {
          id: `pin-${Date.now()}`,
          note: note || null,
          createdAt: new Date().toISOString(),
          repo: foundRepo || {
            id: repoId,
            githubId: '123456',
            name: repoId,
            url: `https://github.com/search?q=${repoId}`,
            description: 'Pinned repository',
            stars: 1200,
            language: 'TypeScript',
            isFork: false,
            pushedAt: new Date().toISOString(),
          },
        };

        list.unshift(newPin);
        localStorage.setItem('stackpulse_pinned_repos', JSON.stringify(list));
        return { pin: newPin, message: 'Repository pinned successfully' };
      }
    },

    update: async (id: string, note: string | null) => {
      try {
        return await this.request<{ pin: any; message: string }>(`/api/pins/${id}`, {
          method: 'PATCH',
          body: JSON.stringify({ note }),
        });
      } catch {
        const stored = localStorage.getItem('stackpulse_pinned_repos');
        const list: PinItem[] = stored ? JSON.parse(stored) : [...MOCK_PINNED_REPOS];
        const updated = list.map((p) => (p.id === id ? { ...p, note } : p));
        localStorage.setItem('stackpulse_pinned_repos', JSON.stringify(updated));
        return { pin: updated.find((p) => p.id === id), message: 'Pin note updated successfully' };
      }
    },

    delete: async (id: string) => {
      try {
        return await this.request<{ message: string }>(`/api/pins/${id}`, { method: 'DELETE' });
      } catch {
        const stored = localStorage.getItem('stackpulse_pinned_repos');
        const list: PinItem[] = stored ? JSON.parse(stored) : [...MOCK_PINNED_REPOS];
        const updated = list.filter((p) => p.id !== id);
        localStorage.setItem('stackpulse_pinned_repos', JSON.stringify(updated));
        return { message: 'Repository unpinned successfully' };
      }
    },
  };
}

export const api = new ApiClient();
