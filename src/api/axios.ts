import axios, { type InternalAxiosRequestConfig } from "axios";
import { store } from "../store/store";
import { logout, reset, setAuthChecked } from "../store/slices/auth/authSlice";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * 1. Public Instance
 * Used for login, registration, and initial refresh calls.
 */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/**
 * 2. Private Instance
 * Used for all authenticated requests.
 */
export const apiPrivate = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/**
 * Request Interceptor
 * Injects the Access Token from Redux into the Authorization header.
 */
apiPrivate.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const state = store.getState();
    
    // Check both locations for the token to satisfy your state structure
    const token = state.auth.accessToken || (state.auth.user as any)?.accessToken;

    if (token && config.headers && !config.headers["Authorization"]) {
      config.headers["Authorization"] = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

/**
 * Response Interceptor
 * Handles 401 errors by attempting to refresh the token.
 */
apiPrivate.interceptors.response.use(
  (response) => response,
  async (error) => {
    const prevRequest = error?.config;

    // Only attempt refresh if status is 401 and we haven't retried yet
    if (error?.response?.status === 401 && !prevRequest?._retry) {
      prevRequest._retry = true;

      try {
        // 1. Hit the refresh endpoint
        const response = await api.get("/auth/refresh");
        
        // 2. Extract data. Note: 'user' is extracted if needed for state, 
        // but we mainly need accessToken for the immediate retry.
        const { accessToken } = response.data;

        // 3. Update Redux store so the rest of the app knows we're back online
        store.dispatch(setAuthChecked(response.data));

        // 4. Update the failed request's header with the new token
        if (prevRequest.headers) {
          prevRequest.headers["Authorization"] = `Bearer ${accessToken}`;
        }

        // 5. Retry the original request with the private instance
        return apiPrivate(prevRequest);
      } catch (refreshError) {
        // If refresh fails (token expired), force logout
        store.dispatch(logout() as any); // Type cast if using async thunk
        store.dispatch(reset());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  }
);