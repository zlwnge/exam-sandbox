import { ApiResponse, ApiListResponse, ApiSingleResponse } from '@/types/api';

class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
    public body: unknown
  ) {
    super(message);
    this.name = 'ApiError';
  }
}

async function request<T>(
  method: string,
  path: string,
  body?: unknown,
  contentType?: string
): Promise<T> {
  const headers: Record<string, string> = {};
  if (contentType) {
    headers['Content-Type'] = contentType;
  } else if (body && typeof body === 'object') {
    headers['Content-Type'] = 'application/json';
  }

  const init: RequestInit = { method, headers };
  if (body && typeof body === 'object' && !contentType) {
    init.body = JSON.stringify(body);
  } else if (body && typeof body === 'string') {
    init.body = body;
  }

  const res = await fetch(path, init);
  const json = await res.json().catch(() => null);

  if (!res.ok) {
    throw new ApiError(
      json?.error || `HTTP ${res.status}`,
      res.status,
      json
    );
  }

  return json as T;
}

export async function get<T>(
  path: string,
  params?: Record<string, string>
): Promise<T> {
  let url = path;
  if (params) {
    const qs = new URLSearchParams();
    Object.entries(params).forEach(([k, v]) => { if (v) qs.append(k, v); });
    const qsStr = qs.toString();
    if (qsStr) url += `?${qsStr}`;
  }
  return request<T>('GET', url);
}

export async function post<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('POST', path, body);
}

export async function put<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('PUT', path, body);
}

export async function del<T>(path: string, body?: unknown): Promise<T> {
  return request<T>('DELETE', path, body);
}

export { ApiError };
export type { ApiResponse, ApiListResponse, ApiSingleResponse };
