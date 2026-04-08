import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import * as strategicPlanService from "./strategicPlanService";
import { type IStrategicPlan } from "./strategicPlanService";

/* ─── TYPES ────────────────────────────────────────────────────────── */

interface IStrategicPlanState {
  plans: IStrategicPlan[];
  loading: boolean;
  error: string | null;
}

interface KnownError {
  response?: {
    data?: {
      message?: string;
    };
  };
  message?: string;
}

/* ─── INITIAL STATE ────────────────────────────────────────────────── */

const initialState: IStrategicPlanState = {
  plans: [],
  loading: false,
  error: null,
};

/* ─── THUNKS ───────────────────────────────────────────────────────── */

const getErr = (err: unknown): string => {
  const error = err as KnownError;
  return error.response?.data?.message || error.message || "An unexpected error occurred";
};

export const getAllStrategicPlans = createAsyncThunk<
  IStrategicPlan[],
  void,
  { rejectValue: string }
>(
  "strategicPlan/getAll",
  async (_, { rejectWithValue }) => {
    try {
      const response = await strategicPlanService.fetchAllStrategicPlans();
      return response.data;
    } catch (error) {
      return rejectWithValue(getErr(error));
    }
  }
);

export const createPlan = createAsyncThunk<
  IStrategicPlan,
  Partial<IStrategicPlan>,
  { rejectValue: string }
>(
  "strategicPlan/create",
  async (planData, { rejectWithValue }) => {
    try {
      const response = await strategicPlanService.createStrategicPlan(planData);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErr(error));
    }
  }
);

export const updatePlan = createAsyncThunk<
  IStrategicPlan,
  { id: string; planData: Partial<IStrategicPlan> },
  { rejectValue: string }
>(
  "strategicPlan/update",
  async ({ id, planData }, { rejectWithValue }) => {
    try {
      const response = await strategicPlanService.updateStrategicPlan(id, planData);
      return response.data;
    } catch (error) {
      return rejectWithValue(getErr(error));
    }
  }
);

export const deletePlan = createAsyncThunk<
  string,
  string,
  { rejectValue: string }
>(
  "strategicPlan/delete",
  async (id, { rejectWithValue }) => {
    try {
      await strategicPlanService.deleteStrategicPlan(id);
      return id;
    } catch (error) {
      return rejectWithValue(getErr(error));
    }
  }
);

/* ─── SLICE ────────────────────────────────────────────────────────── */

const strategicPlanSlice = createSlice({
  name: "strategicPlan",
  initialState,
  reducers: {
    resetStrategicPlanState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      // Fetch All
      .addCase(getAllStrategicPlans.fulfilled, (state, action) => {
        state.loading = false;
        state.plans = action.payload;
      })
      
      // Create
      .addCase(createPlan.fulfilled, (state, action) => {
        state.loading = false;
        state.plans.unshift(action.payload);
      })
      
      // Update
      .addCase(updatePlan.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.plans.findIndex((p) => p.id === action.payload.id);
        if (index !== -1) {
          state.plans[index] = action.payload;
        }
      })
      
      // Delete
      .addCase(deletePlan.fulfilled, (state, action) => {
        state.loading = false;
        state.plans = state.plans.filter((p) => p.id !== action.payload);
      })

      /* ─── MATCHERS ─── */
      .addMatcher(
        (action) => action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith("/rejected"),
        (state, action: PayloadAction<string | undefined>) => {
          state.loading = false;
          state.error = action.payload ?? "An unexpected error occurred";
        }
      );
  },
});

export const { resetStrategicPlanState } = strategicPlanSlice.actions;
export default strategicPlanSlice.reducer;