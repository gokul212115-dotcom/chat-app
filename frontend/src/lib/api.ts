import axios, { type AxiosError, type InternalAxiosRequestConfig } from 'axios';
import { useAuthStore } from '../store/authStore';

const BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3000/api';

export const api = axios.create({
  baseURL: BASE_URL,
});

api.interceptors.request.use((config) => {
  const accessToken = useAuthStore.getState().accessToken;
  if (accessToken && config.headers) {
    config.headers.Authorization = `Bearer ${accessToken}`;
  }
  return config;
});

let isRefreshing = false;
let refreshQueue: Array<() => void> = [];

api.interceptors.response.use(
  (response) => response,
  async (error: AxiosError) => {
    const originalRequest = error.config as InternalAxiosRequestConfig & { _retry?: boolean };

    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;

      const refreshToken = useAuthStore.getState().refreshToken;
      if (!refreshToken) {
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(error);
      }

      if (isRefreshing) {
        return new Promise((resolve) => {
          refreshQueue.push(() => resolve(api(originalRequest)));
        });
      }

      isRefreshing = true;

      try {
        const response = await axios.post(`${BASE_URL}/auth/refresh`, { refreshToken });
        const newAccessToken = response.data.accessToken;

        useAuthStore.getState().setAccessToken(newAccessToken);

        refreshQueue.forEach((callback) => callback());
        refreshQueue = [];
        isRefreshing = false;

        if (originalRequest.headers) {
          originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
        }
        return api(originalRequest);
      } catch (refreshError) {
        isRefreshing = false;
        refreshQueue = [];
        useAuthStore.getState().logout();
        window.location.href = '/login';
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);

export interface UserSearchResult {
  id: number;
  name: string;
  phoneNumber: string;
  avatarUrl: string | null;
}

export async function findUserByPhone(rawPhone: string): Promise<UserSearchResult | null> {
  const phoneNumber = encodeURIComponent(rawPhone);
  try {
    const response = await api.get<UserSearchResult>('/users/search', {
      params: { phoneNumber },
    });
    return response.data;
  } catch (error) {
    return null;
  }
}

export async function uploadFile(file: File | Blob, filename?: string): Promise<{ url: string; mimeType: string; sizeBytes: number }> {
  const formData = new FormData();
  formData.append('file', file, filename);

  try {
    const response = await api.post('/upload', formData);
    // Ensure the URL is absolute (pointing to the backend, not the frontend dev server)
    const data = response.data;
    if (data.url && !data.url.startsWith('http')) {
      data.url = BASE_URL.replace('/api', '') + data.url;  // e.g., http://localhost:3000/uploads/...
    }
    return data;
  } catch (error) {
    throw new Error('File upload failed');
  }
}

const SOCKET_ORIGIN = import.meta.env.VITE_SOCKET_URL || 'http://localhost:3000';

export function getMediaUrl(path: string | null): string {
  if (!path) return '';
  if (path.startsWith('http://') || path.startsWith('https://')) return path;
  return `${SOCKET_ORIGIN}${path}`;
}
