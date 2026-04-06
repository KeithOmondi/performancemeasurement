import { createSlice, createAsyncThunk, isAnyOf } from "@reduxjs/toolkit";
import { userService } from "./userService";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface User {
  _id: string;   // normalized from PG 'id'
  id: string;    // raw PG field (same value, kept for reference)
  name: string;
  email: string;
  role: "user" | "admin" | "superadmin" | "examiner";
  pjNumber: string;
  title: string;
  isActive: boolean;
  createdAt: string;
}

interface UserState {
  users: User[];
  isLoading: boolean;
  isError: boolean;
  message: string;
}

const initialState: UserState = {
  users: [],
  isLoading: false,
  isError: false,
  message: "",
};

/* ------------------------------------------------------------------ */
/*  Thunks                                                              */
/* ------------------------------------------------------------------ */

export const fetchAllUsers = createAsyncThunk(
  "users/fetchAll",
  async (_, thunkAPI) => {
    try {
      return await userService.getUsers();
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const registerUser = createAsyncThunk(
  "users/register",
  async (userData: any, thunkAPI) => {
    try {
      return await userService.createUser(userData);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const editUser = createAsyncThunk(
  "users/edit",
  async ({ id, data }: { id: string; data: any }, thunkAPI) => {
    try {
      return await userService.updateUser(id, data);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const changeUserRole = createAsyncThunk(
  "users/changeRole",
  async (data: { id: string; role: string }, thunkAPI) => {
    try {
      return await userService.updateUserRole(data);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const toggleStatus = createAsyncThunk(
  "users/toggleStatus",
  async (data: { id: string; isActive: boolean }, thunkAPI) => {
    try {
      return await userService.toggleUserActive(data);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const removeUser = createAsyncThunk(
  "users/delete",
  async (id: string, thunkAPI) => {
    try {
      return await userService.deleteUser(id);
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

/* ------------------------------------------------------------------ */
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

/** Match by either normalized _id or raw PG id */
const findUserIndex = (users: User[], id: string): number =>
  users.findIndex((u) => u._id === id || u.id === id);

/* ------------------------------------------------------------------ */
/*  Slice                                                               */
/* ------------------------------------------------------------------ */

export const userSlice = createSlice({
  name: "users",
  initialState,
  reducers: {
    clearUserMessages: (state) => {
      state.isError = false;
      state.message = "";
    },
  },
  extraReducers: (builder) => {
    builder
      // ── fetchAllUsers ──────────────────────────────────────────────
      .addCase(fetchAllUsers.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload;
      })

      // ── registerUser ───────────────────────────────────────────────
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users.unshift(action.payload);
        state.message = "User created successfully";
      })

      // ── removeUser ─────────────────────────────────────────────────
      .addCase(removeUser.fulfilled, (state, action) => {
        state.isLoading = false;
        // action.payload is the raw PG 'id' string returned by deleteUser
        state.users = state.users.filter(
          (u) => u.id !== action.payload && u._id !== action.payload
        );
        state.message = "User removed successfully";
      })

      // ── Shared: pending for all mutations ──────────────────────────
      .addMatcher(
        isAnyOf(
          registerUser.pending,
          editUser.pending,
          changeUserRole.pending,
          toggleStatus.pending,
          removeUser.pending
        ),
        (state) => {
          state.isLoading = true;
          state.isError = false;
          state.message = "";
        }
      )

      // ── Shared: fulfilled for all updates (upsert in array) ────────
      .addMatcher(
        isAnyOf(editUser.fulfilled, changeUserRole.fulfilled, toggleStatus.fulfilled),
        (state, action) => {
          state.isLoading = false;
          const index = findUserIndex(state.users, action.payload._id);
          if (index !== -1) {
            state.users[index] = action.payload;
          } else {
            state.users.unshift(action.payload);
          }
        }
      )

      // ── Shared: rejected for everything ───────────────────────────
      .addMatcher(
        isAnyOf(
          fetchAllUsers.rejected,
          registerUser.rejected,
          editUser.rejected,
          changeUserRole.rejected,
          toggleStatus.rejected,
          removeUser.rejected
        ),
        (state, action) => {
          state.isLoading = false;
          state.isError = true;
          state.message = action.payload as string;
        }
      );
  },
});

export const { clearUserMessages } = userSlice.actions;
export default userSlice.reducer;