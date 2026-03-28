import axios, { type InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosConfig = {
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true, // sends HttpOnly cookies automatically
};

// Public instance — for login, OTP, refresh
export const api = axios.create(axiosConfig);

// Private instance — for all authenticated requests
export const apiPrivate = axios.create(axiosConfig);

// Injected logout handler — avoids circular store imports
let logoutHandler: (() => void) | null = null;

export const injectLogoutHandler = (handler: () => void) => {
  logoutHandler = handler;
};

// Request interceptor — cookies are sent automatically, nothing to inject
apiPrivate.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => config,
  (error) => Promise.reject(error)
);

// Response interceptor — handle 401 by refreshing the cookie
apiPrivate.interceptors.response.use(
  (response) => response,
  async (error) => {
    const prevRequest = error?.config;

    if (error?.response?.status === 401 && !prevRequest?._retry) {
      prevRequest._retry = true;

      try {
        // Backend sets a new accessToken cookie on this call
        await api.get("/auth/refresh");

        // Retry the original request — new cookie is now in the jar
        return apiPrivate(prevRequest);
      } catch (refreshError) {
        // Refresh failed — session is dead, log the user out
        if (logoutHandler) logoutHandler();
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);