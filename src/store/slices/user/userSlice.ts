import { createSlice, createAsyncThunk, isAnyOf } from "@reduxjs/toolkit";
import { userService } from "./userService";

// Define the User interface based on your Mongoose Model
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

// --- Thunks ---

export const fetchAllUsers = createAsyncThunk("users/fetchAll", async (_, thunkAPI) => {
  try {
    return await userService.getUsers();
  } catch (error: any) {
    return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
  }
});

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

// --- Slice ---

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
      // Fetch All Users
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
      // Update Role & Toggle Status - Use isAnyOf for cleaner logic
      .addMatcher(
        isAnyOf(changeUserRole.fulfilled, toggleStatus.fulfilled),
        (state, action) => {
          state.isLoading = false;
          const index = state.users.findIndex((u) => u._id === action.payload._id);
          if (index !== -1) {
            state.users[index] = action.payload; // Updates specific user in the list
          }
        }
      );
  },
});

export const { clearUserMessages } = userSlice.actions;
export default userSlice.reducer;