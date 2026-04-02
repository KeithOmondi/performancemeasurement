import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authService } from "./authService";

// Session hint key — a lightweight flag (NOT the token)
// Set on login, cleared on logout. Used to skip checkAuth for guests.
export const SESSION_KEY = "hasSession";

interface User {
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

const hasSessionHint = !!localStorage.getItem(SESSION_KEY);

const initialState: AuthState = {
  user: null,
  isLoading: false,
  // Only block UI with spinner if there's a session worth checking
  isCheckingAuth: hasSessionHint,
  otpSent: false,
  isError: false,
  message: "",
};

export const requestOTP = createAsyncThunk(
  "auth/requestOTP",
  async (pjNumber: string, thunkAPI) => {
    try {
      return await authService.requestOTP(pjNumber);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const login = createAsyncThunk(
  "auth/login",
  async (loginData: { pjNumber: string; otp: string }, thunkAPI) => {
    try {
      const data = await authService.login(loginData);
      // Mark session as active — skips checkAuth network call next load
      localStorage.setItem(SESSION_KEY, "true");
      return data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const register = createAsyncThunk(
  "auth/register",
  async (userData: any, thunkAPI) => {
    try {
      return await authService.register(userData);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const logout = createAsyncThunk(
  "auth/logout",
  async (_, thunkAPI) => {
    try {
      const data = await authService.logout();
      // Clear session hint so next load skips the auth check
      localStorage.removeItem(SESSION_KEY);
      return data;
    } catch (error: any) {
      localStorage.removeItem(SESSION_KEY);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// Runs once on app load — only if session hint exists
export const checkAuth = createAsyncThunk(
  "auth/checkAuth",
  async (_, thunkAPI) => {
    // No hint → skip the network round-trip entirely
    if (!localStorage.getItem(SESSION_KEY)) {
      return thunkAPI.rejectWithValue("no session");
    }

    try {
      return await authService.checkAuth();
    } catch (error: any) {
      // Stale hint (cookie expired) — clean up
      localStorage.removeItem(SESSION_KEY);
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

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
      // ── Request OTP ────────────────────────────────────────────────────
      .addCase(requestOTP.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(requestOTP.fulfilled, (state, action) => {
        state.isLoading = false;
        state.otpSent = true;
        state.message = action.payload.message;
      })
      .addCase(requestOTP.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })

      // ── Login ──────────────────────────────────────────────────────────
      .addCase(login.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        state.user = action.payload.user;
        state.otpSent = false;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })

      // ── Register ───────────────────────────────────────────────────────
      .addCase(register.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
      })
      .addCase(register.fulfilled, (state) => {
        state.isLoading = false;
        state.message = "User registered successfully.";
      })
      .addCase(register.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })

      // ── Logout ─────────────────────────────────────────────────────────
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.otpSent = false;
        state.message = "";
      })
      .addCase(logout.rejected, (state) => {
        // Clear user locally even if the server call fails
        state.user = null;
      })

      // ── Check Auth (on page refresh) ───────────────────────────────────
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
      });
  },
});

export const { reset } = authSlice.actions;
export default authSlice.reducer;