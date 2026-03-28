import { createSlice, createAsyncThunk, isAnyOf } from "@reduxjs/toolkit";
import { userService } from "./userService";

export interface User {
  _id: string;
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

// ─── Thunks ──────────────────────────────────────────────────────────────────

export const fetchAllUsers = createAsyncThunk("users/fetchAll", async (_, thunkAPI) => {
  try {
    return await userService.getUsers();
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const registerUser = createAsyncThunk("users/register", async (userData: any, thunkAPI) => {
  try {
    return await userService.createUser(userData);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const editUser = createAsyncThunk("users/edit", async ({ id, data }: { id: string; data: any }, thunkAPI) => {
  try {
    return await userService.updateUser(id, data);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const changeUserRole = createAsyncThunk("users/changeRole", async (data: { id: string; role: string }, thunkAPI) => {
  try {
    return await userService.updateUserRole(data);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const toggleStatus = createAsyncThunk("users/toggleStatus", async (data: { id: string; isActive: boolean }, thunkAPI) => {
  try {
    return await userService.toggleUserActive(data);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

export const removeUser = createAsyncThunk("users/delete", async (id: string, thunkAPI) => {
  try {
    return await userService.deleteUser(id);
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

// ─── Slice ───────────────────────────────────────────────────────────────────

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
      })
      .addCase(fetchAllUsers.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = action.payload;
      })
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users.unshift(action.payload);
        state.message = "User created successfully";
      })
      .addCase(removeUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users = state.users.filter((u) => u._id !== action.payload);
        state.message = "User removed successfully";
      })
      // Shared Pending state for all mutations
      .addMatcher(
        isAnyOf(registerUser.pending, editUser.pending, changeUserRole.pending, toggleStatus.pending, removeUser.pending),
        (state) => {
          state.isLoading = true;
        }
      )
      // Shared Fulfilled state for all updates (replaces the user in the array)
      .addMatcher(
        isAnyOf(editUser.fulfilled, changeUserRole.fulfilled, toggleStatus.fulfilled),
        (state, action) => {
          state.isLoading = false;
          const index = state.users.findIndex((u) => u._id === action.payload._id);
          if (index !== -1) {
            state.users[index] = action.payload;
          }
        }
      )
      // Shared Rejected state
      .addMatcher(
        isAnyOf(fetchAllUsers.rejected, registerUser.rejected, editUser.rejected, changeUserRole.rejected, toggleStatus.rejected, removeUser.rejected),
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