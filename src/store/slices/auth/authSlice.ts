import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import { authService } from "./authService";

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

const initialState: AuthState = {
  user: null,
  isLoading: false,
  isCheckingAuth: true, // true on load — prevents flash of login page
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
      return await authService.login(loginData);
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
      return await authService.logout();
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

// Runs once on app load to restore session from the refresh cookie
export const checkAuth = createAsyncThunk(
  "auth/checkAuth",
  async (_, thunkAPI) => {
    try {
      return await authService.checkAuth();
    } catch (error: any) {
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
      // ── Request OTP ──────────────────────────────────────────────────────
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

      // ── Login ────────────────────────────────────────────────────────────
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

      // ── Register ─────────────────────────────────────────────────────────
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

      // ── Logout ───────────────────────────────────────────────────────────
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.otpSent = false;
        state.message = "";
      })
      .addCase(logout.rejected, (state) => {
        // Clear user locally even if the server call fails
        state.user = null;
      })

      // ── Check Auth (on page refresh) ─────────────────────────────────────
      .addCase(checkAuth.pending, (state) => {
        state.isCheckingAuth = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        state.isCheckingAuth = false;
        state.user = action.payload.user;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.isCheckingAuth = false;
        state.user = null; // No valid session — show login
      });
  },
});

export const { reset } = authSlice.actions;
export default authSlice.reducer;