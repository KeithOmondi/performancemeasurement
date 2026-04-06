import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
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

export const getAllStrategicPlans = createAsyncThunk(
  "strategicPlan/getAll",
  async (_, thunkAPI) => {
    try {
      const response = await strategicPlanService.fetchAllStrategicPlans();
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
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
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

export const updatePlan = createAsyncThunk(
  "strategicPlan/update",
  async (
    { id, planData }: { id: string; planData: Partial<IStrategicPlan> },
    thunkAPI
  ) => {
    try {
      const response = await strategicPlanService.updateStrategicPlan(id, planData);
      return response.data;
    } catch (error: any) {
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
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
      return thunkAPI.rejectWithValue(
        error.response?.data?.message || error.message
      );
    }
  }
);

const strategicPlanSlice = createSlice({
  name: "strategicPlan",
  initialState,
  reducers: {
    resetStrategicPlanState: () => initialState,
  },
  extraReducers: (builder) => {
    builder
      .addCase(
        getAllStrategicPlans.fulfilled,
        (state, action: PayloadAction<IStrategicPlan[]>) => {
          state.loading = false;
          state.plans = action.payload;
        }
      )
      .addCase(
        createPlan.fulfilled,
        (state, action: PayloadAction<IStrategicPlan>) => {
          state.loading = false;
          state.plans.unshift(action.payload);
        }
      )
      .addCase(
        updatePlan.fulfilled,
        (state, action: PayloadAction<IStrategicPlan>) => {
          state.loading = false;
          // Updated to look for .id
          const index = state.plans.findIndex((p) => p.id === action.payload.id);
          if (index !== -1) {
            state.plans[index] = action.payload;
          }
        }
      )
      .addCase(
        deletePlan.fulfilled,
        (state, action: PayloadAction<string>) => {
          state.loading = false;
          // Updated to filter by .id
          state.plans = state.plans.filter((p) => p.id !== action.payload);
        }
      )
      // Matchers for Loading and Error states
      .addMatcher(
        (action) => action.type.endsWith("/pending"),
        (state) => {
          state.loading = true;
          state.error = null;
        }
      )
      .addMatcher(
        (action) => action.type.endsWith("/rejected"),
        (state, action: PayloadAction<string>) => {
          state.loading = false;
          state.error = action.payload || "An error occurred";
        }
      );
  },
});

export const { resetStrategicPlanState } = strategicPlanSlice.actions;
export default strategicPlanSlice.reducer;