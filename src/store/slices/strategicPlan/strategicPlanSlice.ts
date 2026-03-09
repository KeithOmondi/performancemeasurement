import { createSlice, createAsyncThunk, type PayloadAction, type Action } from "@reduxjs/toolkit";
import * as strategicPlanService from "./strategicPlanService";
import { type IStrategicPlan } from "./strategicPlanService";

interface IStrategicPlanState {
  plans: IStrategicPlan[];
  loading: boolean;
  error: string | null;
}

const initialState: IStrategicPlanState = {
  plans: [],
  loading: false,
  error: null,
};

/* ---------------- THUNKS ---------------- */
export const getAllStrategicPlans = createAsyncThunk(
  "strategicPlan/getAll",
  async (_, thunkAPI) => {
    try {
      const response = await strategicPlanService.fetchAllStrategicPlans();
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const createPlan = createAsyncThunk(
  "strategicPlan/create",
  async (planData: Partial<IStrategicPlan>, thunkAPI) => {
    try {
      const response = await strategicPlanService.createStrategicPlan(planData);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const updatePlan = createAsyncThunk(
  "strategicPlan/update",
  async ({ id, planData }: { id: string; planData: Partial<IStrategicPlan> }, thunkAPI) => {
    try {
      const response = await strategicPlanService.updateStrategicPlan(id, planData);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

export const deletePlan = createAsyncThunk(
  "strategicPlan/delete",
  async (id: string, thunkAPI) => {
    try {
      await strategicPlanService.deleteStrategicPlan(id);
      return id;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(error.response?.data?.message || error.message);
    }
  }
);

/* ---------------- SLICE ---------------- */
const strategicPlanSlice = createSlice({
  name: "strategicPlan",
  initialState,
  reducers: {
    resetStrategicPlanState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      /* 1. SPECIFIC CASES FIRST (Fixes the .addCase property error) */
      .addCase(getAllStrategicPlans.fulfilled, (state, action: PayloadAction<IStrategicPlan[]>) => {
        state.loading = false;
        state.plans = action.payload;
      })
      .addCase(createPlan.fulfilled, (state, action: PayloadAction<IStrategicPlan>) => {
        state.loading = false;
        state.plans.unshift(action.payload);
      })
      .addCase(updatePlan.fulfilled, (state, action: PayloadAction<IStrategicPlan>) => {
        state.loading = false;
        const index = state.plans.findIndex((p) => p._id === action.payload._id);
        if (index !== -1) {
          state.plans[index] = action.payload;
        }
      })
      .addCase(deletePlan.fulfilled, (state, action: PayloadAction<string>) => {
        state.loading = false;
        state.plans = state.plans.filter((p) => p._id !== action.payload);
      })

      /* 2. GENERAL MATCHERS SECOND (Using explicit types to fix 'any' errors) */
      .addMatcher(
        (action: Action): action is Action & { type: string } => action.type.endsWith("/pending"),
        (state: IStrategicPlanState) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action: Action): action is Action & { type: string; payload: string } => action.type.endsWith("/rejected"),
        (state: IStrategicPlanState, action) => {
          state.loading = false;
          state.error = (action.payload as string) || "An unexpected error occurred";
        }
      );
  },
});

export const { resetStrategicPlanState } = strategicPlanSlice.actions;
export default strategicPlanSlice.reducer;