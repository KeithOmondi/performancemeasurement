import axios, { type InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosConfig = {
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
};

// Public instance — for login, OTP, refresh
// Timeout of 6s so a dead server doesn't hang the app indefinitely
export const api = axios.create({ ...axiosConfig, timeout: 6000 });

// Private instance — for all authenticated requests
export const apiPrivate = axios.create({ ...axiosConfig, timeout: 10000 });

// Injected logout handler — avoids circular store imports
let logoutHandler: (() => void) | null = null;

export const injectLogoutHandler = (handler: () => void) => {
  logoutHandler = handler;
};

// Request interceptor — cookies sent automatically, nothing to inject
apiPrivate.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  (error) => Promise.reject(error)
);

// Response interceptor — on 401, attempt a silent token refresh
apiPrivate.interceptors.response.use(
  (response) => response,
  async (error) => {
    const prevRequest = error?.config;

    if (error?.response?.status === 401 && !prevRequest?._retry) {
      prevRequest._retry = true;

      try {
        await api.get("/auth/refresh");
        return apiPrivate(prevRequest);
      } catch (refreshError) {
        if (logoutHandler) logoutHandler();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);