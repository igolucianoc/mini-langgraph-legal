import type { AuthResult, AuthTokens, HistoryItem } from './types';

const API_URL =
  process.env.NEXT_PUBLIC_API_URL ?? 'http://localhost:3001';

export function apiBaseUrl(): string {
  return API_URL;
}

export class ApiError extends Error {
  constructor(
    message: string,
    readonly status: number,
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function parseError(response: Response): Promise<string> {
  try {
    const body: unknown = await response.json();
    if (
      typeof body === 'object' &&
      body !== null &&
      'message' in body &&
      typeof (body as { message: unknown }).message === 'string'
    ) {
      return (body as { message: string }).message;
    }
  } catch {
    // corpo não-JSON; usa mensagem genérica
  }
  return `Erro ${response.status}`;
}

async function postJson<T>(path: string, body: unknown): Promise<T> {
  const response = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
  return (await response.json()) as T;
}

export const authApi = {
  register(email: string, password: string): Promise<AuthResult> {
    return postJson<AuthResult>('/auth/register', { email, password });
  },
  login(email: string, password: string): Promise<AuthResult> {
    return postJson<AuthResult>('/auth/login', { email, password });
  },
  refresh(refreshToken: string): Promise<AuthTokens> {
    return postJson<AuthTokens>('/auth/refresh', { refreshToken });
  },
  async logout(refreshToken: string): Promise<void> {
    await fetch(`${API_URL}/auth/logout`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken }),
    });
  },
};

export async function fetchHistory(accessToken: string): Promise<HistoryItem[]> {
  const response = await fetch(`${API_URL}/research/history`, {
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
  return (await response.json()) as HistoryItem[];
}

export async function clearHistory(accessToken: string): Promise<void> {
  const response = await fetch(`${API_URL}/research/history`, {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` },
  });
  if (!response.ok) {
    throw new ApiError(await parseError(response), response.status);
  }
}
