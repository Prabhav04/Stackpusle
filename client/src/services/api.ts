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

  // Auth APIs
  auth = {
    register: (email: string, password: string) =>
      this.request<{ user: User; message: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    login: (email: string, password: string) =>
      this.request<{ user: User; message: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify({ email, password }),
      }),

    logout: () =>
      this.request<{ message: string }>('/api/auth/logout', {
        method: 'POST',
      }),

    getMe: () =>
      this.request<{ user: User | null }>('/api/auth/me'),
  };

  // Developer APIs
  developers = {
    get: (username: string, refresh = false) =>
      this.request<DeveloperProfileResponse>(
        `/api/developers/${encodeURIComponent(username)}${refresh ? '?refresh=true' : ''}`
      ),

    getRecent: () =>
      this.request<{ recentViews: RecentViewItem[] }>('/api/developers/recent'),
  };

  // Compare APIs
  compare = {
    get: (usernames: string[]) =>
      this.request<ComparisonResponse>(
        `/api/compare?users=${usernames.map(encodeURIComponent).join(',')}`
      ),

    getSaved: () =>
      this.request<{ comparisons: SavedComparison[] }>('/api/comparisons'),

    save: (name: string, usernames: string[]) =>
      this.request<{ comparison: SavedComparison; message: string }>('/api/comparisons', {
        method: 'POST',
        body: JSON.stringify({ name, usernames }),
      }),

    getById: (id: string) =>
      this.request<{ comparison: SavedComparison }>(`/api/comparisons/${id}`),

    delete: (id: string) =>
      this.request<{ message: string }>(`/api/comparisons/${id}`, {
        method: 'DELETE',
      }),
  };

  // Pin APIs
  pins = {
    list: () =>
      this.request<{ pins: PinItem[] }>('/api/pins'),

    create: (repoId: string, note?: string) =>
      this.request<{ pin: PinItem; message: string }>('/api/pins', {
        method: 'POST',
        body: JSON.stringify({ repoId, note }),
      }),

    update: (id: string, note: string | null) =>
      this.request<{ pin: any; message: string }>(`/api/pins/${id}`, {
        method: 'PATCH',
        body: JSON.stringify({ note }),
      }),

    delete: (id: string) =>
      this.request<{ message: string }>(`/api/pins/${id}`, {
        method: 'DELETE',
      }),
  };
}

export const api = new ApiClient();
