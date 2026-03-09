import axios from "axios";
import { store } from "../store/store";
import { logout, reset } from "../store/slices/auth/authSlice";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

/**
 * 1. Public Instance
 */
export const api = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/**
 * 2. Private Instance
 */
export const apiPrivate = axios.create({
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
});

/**
 * Request Interceptor
 */
apiPrivate.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => Promise.reject(error),
);

/**
 * Response Interceptor
 */
apiPrivate.interceptors.response.use(
  (response) => response,
  async (error) => {
    const prevRequest = error?.config;

    if (error?.response?.status === 401 && !prevRequest?.sent) {
      prevRequest.sent = true;

      try {
        await api.get("/auth/refresh");
        return apiPrivate(prevRequest);
      } catch (refreshError) {
        store.dispatch(logout());
        store.dispatch(reset());
        return Promise.reject(refreshError);
      }
    }

    return Promise.reject(error);
  },
);
