import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { api } from "../../../api/axios";

/* ─── TYPES ────────────────────────────────────────────────────────── */

export const SESSION_KEY = "hasSession";

export interface User {
  id: string;
  name: string;
  email: string;
  pjNumber: string;
  role: "user" | "admin" | "superadmin" | "examiner";
}

interface AuthState {
  user: User | null;
  isLoading: boolean;
  isCheckingAuth: boolean;
  otpSent: boolean;
  isError: boolean;
  message: string;
}

interface KnownError {
  response?: { data?: { message?: string } };
  message?: string;
}

/* ─── SERVICE ──────────────────────────────────────────────────────── */

const authService = {
  requestOTP: async (pjNumber: string) => {
    const response = await api.post<{ message: string }>("/auth/request-otp", { pjNumber });
    return response.data;
  },
  login: async (loginData: { pjNumber: string; otp: string }) => {
    const response = await api.post<{ user: User }>("/auth/login", loginData);
    return response.data;
  },
  register: async (userData: Partial<User>) => {
    const response = await api.post<{ message: string }>("/auth/register", userData);
    return response.data;
  },
  logout: async () => {
    const response = await api.post<{ message: string }>("/auth/logout");
    return response.data;
  },
  checkAuth: async () => {
    const response = await api.get<{ user: User }>("/auth/refresh");
    return response.data;
  },
};

/* ─── INITIAL STATE ────────────────────────────────────────────────── */

const hasSessionHint = !!localStorage.getItem(SESSION_KEY);

const initialState: AuthState = {
  user: null,
  isLoading: false,
  isCheckingAuth: hasSessionHint,
  otpSent: false,
  isError: false,
  message: "",
};

/* ─── THUNKS ───────────────────────────────────────────────────────── */

const getErr = (err: unknown) => {
  const error = err as KnownError;
  return error.response?.data?.message || error.message || "An error occurred";
};

export const requestOTP = createAsyncThunk<{ message: string }, string, { rejectValue: string }>(
  "auth/requestOTP",
  async (pjNumber, { rejectWithValue }) => {
    try {
      return await authService.requestOTP(pjNumber);
    } catch (error) {
      return rejectWithValue(getErr(error));
    }
  }
);

export const login = createAsyncThunk<{ user: User }, { pjNumber: string; otp: string }, { rejectValue: string }>(
  "auth/login",
  async (loginData, { rejectWithValue }) => {
    try {
      const data = await authService.login(loginData);
      localStorage.setItem(SESSION_KEY, "true");
      return data;
    } catch (error) {
      return rejectWithValue(getErr(error));
    }
  }
);

export const register = createAsyncThunk<{ message: string }, Partial<User>, { rejectValue: string }>(
  "auth/register",
  async (userData, { rejectWithValue }) => {
    try {
      return await authService.register(userData);
    } catch (error) {
      return rejectWithValue(getErr(error));
    }
  }
);

export const logout = createAsyncThunk<void, void, { rejectValue: string }>(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      await authService.logout();
      localStorage.removeItem(SESSION_KEY);
    } catch (error) {
      localStorage.removeItem(SESSION_KEY);
      return rejectWithValue(getErr(error));
    }
  }
);

export const checkAuth = createAsyncThunk<{ user: User }, void, { rejectValue: string }>(
  "auth/checkAuth",
  async (_, { rejectWithValue }) => {
    if (!localStorage.getItem(SESSION_KEY)) return rejectWithValue("no session");
    try {
      return await authService.checkAuth();
    } catch (error) {
      localStorage.removeItem(SESSION_KEY);
      return rejectWithValue(getErr(error));
    }
  }
);

/* ─── SLICE ────────────────────────────────────────────────────────── */

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isError = false;
      state.message = "";
      state.otpSent = false;
    },
  },
  extraReducers: (builder) => {
    builder
      // OTP
      .addCase(requestOTP.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(requestOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.otpSent = true;
        state.message = action.payload.message;
      })
      .addCase(requestOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload ?? "Failed to send OTP";
      })

      // Login
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.otpSent = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload ?? "Login failed";
      })

      // Check Auth
      .addCase(checkAuth.pending, (state) => {
        state.isCheckingAuth = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isCheckingAuth = false;
        state.user = action.payload.user;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isCheckingAuth = false;
        state.user = null;
      })

      // Logout
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.otpSent = false;
      })
      .addCase(logout.rejected, (state) => {
        state.user = null;
      });
  },
});

export const { reset } = authSlice.actions;
export default authSlice.reducer;