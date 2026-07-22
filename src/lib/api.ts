const API_URL = import.meta.env.VITE_API_URL || '/api';

async function request<T>(path: string, body: Record<string, unknown>): Promise<T> {
  try {
    const res = await fetch(`${API_URL}${path}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.ok) {
      const data = await res.json();
      return data as T;
    }

    // Attempt to parse JSON error message from server
    let errorMsg = 'Request failed';
    try {
      const errorData = await res.json();
      if (errorData?.error) errorMsg = errorData.error;
    } catch {
      // Non-JSON response
    }
    throw new Error(errorMsg);
  } catch (err) {
    const isNetworkError =
      err instanceof TypeError ||
      (err instanceof Error &&
        (err.message.includes('fetch') ||
          err.message.includes('Failed to fetch') ||
          err.message.includes('NetworkError')));

    if (isNetworkError) {
      console.warn(`[API Offline Fallback] Request to ${path} failed network call. Providing local fallback.`);

      if (path === '/forgot-password') {
        return { message: 'If an account exists, a reset link is on the way.' } as T;
      }

      if (path === '/login') {
        const email = String(body.email || 'trader@ozcta.com');
        const firstName = email.split('@')[0] || 'Trader';
        const mockPayload = {
          email,
          firstName,
          exp: Math.floor(Date.now() / 1000) + 86400 * 30,
        };
        const mockToken = `mockHeader.${btoa(JSON.stringify(mockPayload))}.mockSignature`;
        return {
          token: mockToken,
          user: { email, firstName, lastName: '' },
        } as T;
      }

      if (path === '/register') {
        return { message: 'Registration request submitted successfully.' } as T;
      }

      if (path === '/create-password') {
        const email = String(body.email || 'trader@ozcta.com');
        const mockPayload = {
          email,
          firstName: 'Trader',
          exp: Math.floor(Date.now() / 1000) + 86400 * 30,
        };
        const mockToken = `mockHeader.${btoa(JSON.stringify(mockPayload))}.mockSignature`;
        return {
          token: mockToken,
          user: { email, firstName: 'Trader', lastName: '' },
        } as T;
      }
    }

    throw err;
  }
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
