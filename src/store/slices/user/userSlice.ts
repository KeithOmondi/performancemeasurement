import { createSlice, createAsyncThunk, isAnyOf, type PayloadAction } from "@reduxjs/toolkit";
import { userService } from "./userService";

/* ─── TYPES ────────────────────────────────────────────────────────── */

export interface User {
  _id: string;   // normalized from PG 'id'
  id: string;    // raw PG field
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

/* ─── THUNKS ───────────────────────────────────────────────────────── */

export const fetchAllUsers = createAsyncThunk<User[], void, { rejectValue: string }>(
  "users/fetchAll",
  async (_, thunkAPI) => {
    try {
      return await userService.getUsers();
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message || "Failed to fetch users");
    }
  }
);

export const registerUser = createAsyncThunk<User, Partial<User>, { rejectValue: string }>(
  "users/register",
  async (userData, thunkAPI) => {
    try {
      return await userService.createUser(userData);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message || "Failed to register user");
    }
  }
);

export const editUser = createAsyncThunk<User, { id: string; data: Partial<User> }, { rejectValue: string }>(
  "users/edit",
  async ({ id, data }, thunkAPI) => {
    try {
      return await userService.updateUser(id, data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message || "Update failed");
    }
  }
);

export const changeUserRole = createAsyncThunk<User, { id: string; role: string }, { rejectValue: string }>(
  "users/changeRole",
  async (data, thunkAPI) => {
    try {
      return await userService.updateUserRole(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message || "Role change failed");
    }
  }
);

export const toggleStatus = createAsyncThunk<User, { id: string; isActive: boolean }, { rejectValue: string }>(
  "users/toggleStatus",
  async (data, thunkAPI) => {
    try {
      return await userService.toggleUserActive(data);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message || "Status toggle failed");
    }
  }
);

export const removeUser = createAsyncThunk<string, string, { rejectValue: string }>(
  "users/delete",
  async (id, thunkAPI) => {
    try {
      return await userService.deleteUser(id);
    } catch (error: unknown) {
      const err = error as { response?: { data?: { message?: string } }; message?: string };
      return thunkAPI.rejectWithValue(err.response?.data?.message || err.message || "Deletion failed");
    }
  }
);

/* ─── HELPERS ──────────────────────────────────────────────────────── */

const findUserIndex = (users: User[], id: string): number =>
  users.findIndex((u) => u._id === id || u.id === id);

/* ─── SLICE ────────────────────────────────────────────────────────── */

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
      .addCase(fetchAllUsers.pending, (state) => {
        state.isLoading = true;
        state.isError = false;
        state.message = "";
      })
      .addCase(fetchAllUsers.fulfilled, (state, action: PayloadAction<User[]>) => {
        state.isLoading = false;
        state.users = action.payload;
      })
      .addCase(registerUser.fulfilled, (state, action: PayloadAction<User>) => {
        state.isLoading = false;
        state.users.unshift(action.payload);
        state.message = "User created successfully";
      })
      .addCase(removeUser.fulfilled, (state, action: PayloadAction<string>) => {
        state.isLoading = false;
        state.users = state.users.filter(
          (u) => u.id !== action.payload && u._id !== action.payload
        );
        state.message = "User removed successfully";
      })
      .addMatcher(
        isAnyOf(registerUser.pending, editUser.pending, changeUserRole.pending, toggleStatus.pending, removeUser.pending),
        (state) => {
          state.isLoading = true;
          state.isError = false;
          state.message = "";
        }
      )
      .addMatcher(
        isAnyOf(editUser.fulfilled, changeUserRole.fulfilled, toggleStatus.fulfilled),
        (state, action: PayloadAction<User>) => {
          state.isLoading = false;
          const index = findUserIndex(state.users, action.payload._id);
          if (index !== -1) {
            state.users[index] = action.payload;
          } else {
            state.users.unshift(action.payload);
          }
        }
      )
      .addMatcher(
        isAnyOf(fetchAllUsers.rejected, registerUser.rejected, editUser.rejected, changeUserRole.rejected, toggleStatus.rejected, removeUser.rejected),
        (state, action) => {
          state.isLoading = false;
          state.isError = true;
          state.message = (action.payload as string) || "An unexpected error occurred";
        }
      );
  },
});

export const { clearUserMessages } = userSlice.actions;
export default userSlice.reducer;