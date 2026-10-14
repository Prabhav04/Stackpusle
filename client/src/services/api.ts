import type {
  User,
  DeveloperProfileResponse,
  ComparisonResponse,
  SavedComparison,
  PinItem,
  RecentViewItem,
} from '../types/index.js';

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

  // Auth APIs (Direct PostgreSQL session authentication)
  auth = {
    register: async (email: string, password: string) => {
      localStorage.removeItem('stackpulse_demo_user');
      return await this.request<{ user: User; message: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },

    login: async (email: string, password: string) => {
      localStorage.removeItem('stackpulse_demo_user');
      return await this.request<{ user: User; message: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      });
    },

    logout: async () => {
      localStorage.removeItem('stackpulse_demo_user');
      return await this.request<{ message: string }>('/api/auth/logout', {
        method: 'POST',
      });
    },

    getMe: async () => {
      localStorage.removeItem('stackpulse_demo_user');
      return await this.request<{ user: User | null }>('/api/auth/me');
    },
  };

  // Developer APIs (Direct backend GitHub client & PostgreSQL cache)
  developers = {
    get: async (rawUsername: string, refresh = false) => {
      const username = rawUsername.trim().toLowerCase();
      return await this.request<DeveloperProfileResponse>(
        `/api/developers/${encodeURIComponent(username)}${refresh ? '?refresh=true' : ''}`
      );
    },

    getRecent: async () => {
      return await this.request<{ recentViews: RecentViewItem[] }>('/api/developers/recent');
    },
  };

  // Compare APIs (Live calculation & saved comparisons in PostgreSQL)
  compare = {
    get: async (usernames: string[]) => {
      return await this.request<ComparisonResponse>(
        `/api/compare?users=${usernames.map(encodeURIComponent).join(',')}`
      );
    },

    getSaved: async () => {
      return await this.request<{ comparisons: SavedComparison[] }>('/api/comparisons');
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

  // Pin APIs (User-isolated pins & notes stored in PostgreSQL)
  pins = {
    list: async () => {
      return await this.request<{ pins: PinItem[] }>('/api/pins');
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
