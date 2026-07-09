import axios, { type InternalAxiosRequestConfig } from "axios";

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

const axiosConfig = {
  baseURL: BASE_URL,
  headers: { "Content-Type": "application/json" },
  withCredentials: true,
};

// Public instance — for login, OTP, refresh
// Increased timeout for Neon cold starts
export const api = axios.create({ 
  ...axiosConfig, 
  timeout: 60000, // Increased to 60 seconds
});

// Private instance — for all authenticated requests
export const apiPrivate = axios.create({ 
  ...axiosConfig, 
  timeout: 60000, // Increased to 60 seconds
});

// Injected logout handler — avoids circular store imports
let logoutHandler: (() => void) | null = null;

export const injectLogoutHandler = (handler: () => void) => {
  logoutHandler = handler;
};

// Request interceptor with logging
apiPrivate.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    console.log(`[API] Request: ${config.method?.toUpperCase()} ${config.url}`, {
      timeout: config.timeout,
      data: config.data
    });
    return config;
  },
  (error) => Promise.reject(error)
);

// Response interceptor with timeout handling
apiPrivate.interceptors.response.use(
  (response) => {
    console.log(`[API] Response: ${response.config.url}`, {
      status: response.status,
      dataSize: JSON.stringify(response.data).length
    });
    return response;
  },
  async (error) => {
    // Handle timeout specifically
    if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
      console.error(`[API] Timeout: ${error.config?.url}`);
      return Promise.reject(new Error('Request timed out. The server may be waking up. Please try again.'));
    }

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