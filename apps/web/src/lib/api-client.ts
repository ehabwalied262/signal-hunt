import axios from 'axios';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000';

/**
 * Axios instance pre-configured for the SignalHunt API.
 *
 * Auth strategy: httpOnly cookie (set by the server on login).
 * The browser attaches the cookie automatically on every request —
 * no token stored in localStorage, not accessible to JS/XSS.
 *
 * withCredentials: true is required for cross-origin cookie sending.
 */
export const apiClient = axios.create({
  baseURL: `${API_URL}/api/v1`,
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true, // send httpOnly cookie on every request
});

/**
 * Response interceptor — handle auth errors.
 * No token removal needed (cookie is httpOnly, server clears it on logout).
 */
apiClient.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response?.status === 401) {
      if (typeof window !== 'undefined') {
        if (!window.location.pathname.startsWith('/login')) {
          window.location.href = '/login';
        }
      }
    }
    return Promise.reject(error);
  },
);