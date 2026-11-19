import type {
  AnalysisReport,
  DashboardStats,
  DashboardSummaryItem,
  FeedbackEntry,
  User,
} from './types';

const TOKEN_STORAGE_KEY = 'truthguard_auth_token';
let inMemoryToken: string | null = null;

export function getAuthToken(): string | null {
  if (inMemoryToken) return inMemoryToken;
  try {
    const stored = window.localStorage.getItem(TOKEN_STORAGE_KEY);
    if (stored) {
      inMemoryToken = stored;
      return stored;
    }
  } catch {
    // Ignore storage access errors in restricted contexts
  }
  return null;
}

export function setAuthToken(token: string | undefined | null): void {
  if (!token) return;
  inMemoryToken = token;
  try {
    window.localStorage.setItem(TOKEN_STORAGE_KEY, token);
  } catch {
    // Ignore storage access errors in restricted contexts
  }
}

export function clearAuthToken(): void {
  inMemoryToken = null;
  try {
    window.localStorage.removeItem(TOKEN_STORAGE_KEY);
  } catch {
    // Ignore storage access errors in restricted contexts
  }
}

function buildAuthHeaders(extra?: HeadersInit): HeadersInit {
  const token = getAuthToken();
  const headers: Record<string, string> = {
    Accept: 'application/json',
    'Content-Type': 'application/json',
  };
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  if (extra && typeof extra === 'object' && !Array.isArray(extra)) {
    Object.assign(headers, extra);
  }
  return headers;
}

async function requestJson<T>(url: string, options?: RequestInit): Promise<T> {
  const response = await fetch(url, {
    credentials: 'include',
    ...options,
    headers: buildAuthHeaders(options?.headers),
  });

  const rawText = await response.text().catch(() => '');
  let data: ({ error?: unknown } & T) | null = null;
  if (rawText) {
    try {
      data = JSON.parse(rawText) as { error?: unknown } & T;
    } catch {
      data = null;
    }
  }

  if (!response.ok) {
    if (response.status === 401 && !url.startsWith('/api/auth/')) {
      clearAuthToken();
    }
    const errMsg =
      (typeof data?.error === 'string' && data.error) ||
      (rawText && !rawText.trim().startsWith('<') ? rawText.slice(0, 300) : '') ||
      `Request failed with status ${response.status}`;
    throw new Error(errMsg);
  }
  if (!data || typeof data !== 'object') {
    const looksLikeHtml = rawText.trim().startsWith('<');
    throw new Error(
      looksLikeHtml
        ? 'API endpoint returned HTML instead of JSON. Please ensure the backend server is running.'
        : 'Server returned an empty or invalid JSON response.'
    );
  }
  return data;
}

export const api = {
  auth: {
    me: async (): Promise<{ user: User | null }> => {
      const token = getAuthToken();
      const headers: Record<string, string> = {
        Accept: 'application/json',
      };
      if (token) {
        headers.Authorization = `Bearer ${token}`;
      }
      const response = await fetch('/api/auth/me', {
        credentials: 'include',
        headers,
      });
      if (response.status === 401) {
        clearAuthToken();
        return { user: null };
      }
      if (!response.ok) throw new Error('Unable to verify active session.');
      const rawText = await response.text().catch(() => '');
      try {
        const parsed = JSON.parse(rawText) as { user: User | null };
        return parsed && typeof parsed === 'object' ? parsed : { user: null };
      } catch {
        return { user: null };
      }
    },
    register: async (payload: {
      fullName: string;
      email: string;
      username: string;
      password: string;
      confirmPassword: string;
    }) => {
      const res = await requestJson<{ user: User; token?: string }>('/api/auth/register', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAuthToken(res.token);
      return { user: res.user };
    },
    login: async (payload: { identifier: string; password: string }) => {
      const res = await requestJson<{ user: User; token?: string }>('/api/auth/login', {
        method: 'POST',
        body: JSON.stringify(payload),
      });
      setAuthToken(res.token);
      return { user: res.user };
    },
    logout: async () => {
      try {
        return await requestJson<{ ok: boolean }>('/api/auth/logout', {
          method: 'POST',
        });
      } finally {
        clearAuthToken();
      }
    },
    forgotPassword: (identifier: string) =>
      requestJson<{ message: string; recoveryCode: string; email: string }>(
        '/api/auth/forgot-password',
        {
          method: 'POST',
          body: JSON.stringify({ identifier }),
        }
      ),
    resetPassword: (payload: { identifier: string; code: string; newPassword: string }) =>
      requestJson<{ message: string }>('/api/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
  dashboard: {
    get: () =>
      requestJson<{ stats: DashboardStats; recentAnalyses: DashboardSummaryItem[] }>(
        '/api/dashboard'
      ),
  },
  analyses: {
    analyze: (payload: { content: string; url: string }) =>
      requestJson<{ analysis: AnalysisReport }>('/api/analyze', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
    list: (params?: { verdict?: string; q?: string }) => {
      const search = new URLSearchParams();
      if (params?.verdict && params.verdict !== 'ALL') search.set('verdict', params.verdict);
      if (params?.q) search.set('q', params.q);
      const qs = search.toString();
      return requestJson<{ analyses: AnalysisReport[] }>(
        `/api/analyses${qs ? `?${qs}` : ''}`
      );
    },
    getById: (id: number) =>
      requestJson<{ analysis: AnalysisReport }>(`/api/analyses/${id}`),
    remove: (id: number) =>
      requestJson<{ ok: boolean }>(`/api/analyses/${id}`, { method: 'DELETE' }),
  },
  feedback: {
    list: () => requestJson<{ feedbackList: FeedbackEntry[] }>('/api/feedback'),
    submit: (payload: {
      rating: number;
      category: string;
      comments: string;
      analysisId?: number | null;
    }) =>
      requestJson<{ feedback: FeedbackEntry }>('/api/feedback', {
        method: 'POST',
        body: JSON.stringify(payload),
      }),
  },
};
