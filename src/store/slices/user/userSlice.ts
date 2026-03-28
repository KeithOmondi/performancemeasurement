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

// 🆕 Create User Thunk
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
      .addCase(fetchAllUsers.rejected, (state, action) => {
        state.isLoading = false;
        state.isError = true;
        state.message = action.payload as string;
      })
      // 🆕 Handle newly created user
      .addCase(registerUser.fulfilled, (state, action) => {
        state.isLoading = false;
        state.users.unshift(action.payload); // Add to beginning of list
        state.message = "User created successfully";
      })
      // Shared pending for all mutations (Create, Role Change, Toggle)
      .addMatcher(
        isAnyOf(registerUser.pending, changeUserRole.pending, toggleStatus.pending),
        (state) => {
          state.isLoading = true;
        }
      )
      // Shared fulfilled for existing user updates (Role Change, Toggle)
      .addMatcher(
        isAnyOf(changeUserRole.fulfilled, toggleStatus.fulfilled),
        (state, action) => {
          state.isLoading = false;
          const index = state.users.findIndex((u) => u._id === action.payload._id);
          if (index !== -1) {
            state.users[index] = action.payload;
          }
        }
      )
      // Shared rejected for all mutations
      .addMatcher(
        isAnyOf(registerUser.rejected, changeUserRole.rejected, toggleStatus.rejected),
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