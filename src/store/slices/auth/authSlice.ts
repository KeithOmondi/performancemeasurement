import {
  createSlice,
  createAsyncThunk,
  type PayloadAction,
} from "@reduxjs/toolkit";
import { authService } from "./authService";

interface User {
  id: string;
  name: string;
  email: string;
  role: "user" | "admin" | "superadmin" | "examiner";
  // Added optional accessToken here in case your backend nests it in the user object
  accessToken?: string; 
}

interface AuthState {
  user: User | null;
  accessToken: string | null; // 🔹 ADDED THIS LINE
  isLoading: boolean;
  isCheckingAuth: boolean;
  isError: boolean;
  message: string;
}

const initialState: AuthState = {
  user: null,
  accessToken: null, // 🔹 INITIALIZED HERE
  isLoading: false,
  isCheckingAuth: true,
  isError: false,
  message: "",
};

// ... thunks (register, login, logout, checkAuth) remain the same ...

export const register = createAsyncThunk(
  "auth/register",
  async (userData: any, thunkAPI) => {
    try {
      return await authService.register(userData);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message,
      );
    }
  },
);

export const login = createAsyncThunk(
  "auth/login",
  async (userData: any, thunkAPI) => {
    try {
      return await authService.login(userData);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message,
      );
    }
  },
);

export const logout = createAsyncThunk("auth/logout", async (_, thunkAPI) => {
  try {
    return await authService.logout();
  } catch (error: any) {
    return thunkAPI.rejectWithValue(
      error.response?.data?.message || error.message,
    );
  }
});

export const checkAuth = createAsyncThunk(
  "auth/checkAuth",
  async (_, thunkAPI) => {
    try {
      return await authService.checkAuth();
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message,
      );
    }
  },
);

export const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    reset: (state) => {
      state.isLoading = false;
      state.isError = false;
      state.message = "";
    },
    // 🔹 UPDATED: Handles both user and token
    setAuthChecked: (state, action: PayloadAction<any>) => {
      if (action.payload) {
        state.user = action.payload.user || action.payload;
        state.accessToken = action.payload.accessToken || null;
      } else {
        state.user = null;
        state.accessToken = null;
      }
      state.isCheckingAuth = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(login.pending, (state) => {
        state.isLoading = true;
      })
      .addCase(login.fulfilled, (state, action) => {
        state.isLoading = false;
        // 🔹 UPDATED: Assuming your API returns { user, accessToken }
        state.user = action.payload.user || action.payload;
        state.accessToken = action.payload.accessToken || null;
      })
      .addCase(login.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      .addCase(logout.fulfilled, (state) => {
        state.user = null;
        state.accessToken = null; // 🔹 CLEAR ON LOGOUT
      })
      .addCase(checkAuth.pending, (state) => {
        state.isCheckingAuth = true;
      })
      .addCase(checkAuth.fulfilled, (state, action) => {
        // 🔹 UPDATED: Save both on verifySession/refresh
        state.user = action.payload.user || action.payload;
        state.accessToken = action.payload.accessToken || null;
        state.isCheckingAuth = false;
      })
      .addCase(checkAuth.rejected, (state) => {
        state.user = null;
        state.accessToken = null;
        state.isCheckingAuth = false;
      });
  },
});

export const { reset, setAuthChecked } = authSlice.actions;
export default authSlice.reducer;