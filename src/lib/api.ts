const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  const res = await fetch(`${API_URL}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Request failed');
  return data as T;
}

export type AuthResponse = {
  token: string;
  user: { email: string; firstName: string; lastName: string };
};

export function apiRegister(data: {
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  professional: string;
}) {
  return request<{ message: string }>('/register', data);
}

export function apiCreatePassword(data: {
  email: string;
  token: string;
  password: string;
}) {
  return request<AuthResponse>('/create-password', data);
}

export function apiForgotPassword(data: { email: string }) {
  return request<{ message: string }>('/forgot-password', data);
}

export function apiLogin(data: { email: string; password: string }) {
  return request<AuthResponse>('/login', data);
}
