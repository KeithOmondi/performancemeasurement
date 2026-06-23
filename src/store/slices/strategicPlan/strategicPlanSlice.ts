import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import * as strategicPlanService from "./strategicPlanService";
import type {
  IStrategicPlan,
  IObjective,
  IActivity,
  IActivityIndicator,
} from "./strategicPlanService";

// ─── STATE TYPE ───────────────────────────────────────────────────────────────

interface IStrategicPlanState {
  plans: IStrategicPlan[];
  // Cache of activityId → indicator (null means confirmed "no indicator")
  activityIndicators: Record<string, IActivityIndicator | null>;
  loading: boolean;
  actionLoading: boolean; // for add/edit ops so list doesn't flash
  error: string | null;
}

interface KnownError {
  response?: { data?: { message?: string } };
  message?: string;
}

const initialState: IStrategicPlanState = {
  plans: [],
  activityIndicators: {},
  loading: false,
  actionLoading: false,
  error: null,
};

const getErr = (err: unknown): string => {
  const error = err as KnownError;
  return error.response?.data?.message || error.message || "An unexpected error occurred";
};

// ─── PLAN THUNKS ──────────────────────────────────────────────────────────────

export const getAllStrategicPlans = createAsyncThunk <
  IStrategicPlan[], void, { rejectValue: string }
>("strategicPlan/getAll", async (_, { rejectWithValue }) => {
  try {
    const response = await strategicPlanService.fetchAllStrategicPlans();
    return response.data;
  } catch (err) {
    return rejectWithValue(getErr(err));
  }
});

export const createPlan = createAsyncThunk <
  IStrategicPlan, Partial<IStrategicPlan>, { rejectValue: string }
>("strategicPlan/create", async (planData, { rejectWithValue }) => {
  try {
    const response = await strategicPlanService.createStrategicPlan(planData);
    return response.data;
  } catch (err) {
    return rejectWithValue(getErr(err));
  }
});

export const updatePlan = createAsyncThunk <
  IStrategicPlan,
  { id: string; planData: Partial<IStrategicPlan> },
  { rejectValue: string }
>("strategicPlan/update", async ({ id, planData }, { rejectWithValue }) => {
  try {
    const response = await strategicPlanService.updateStrategicPlan(id, planData);
    return response.data;
  } catch (err) {
    return rejectWithValue(getErr(err));
  }
});

export const deletePlan = createAsyncThunk <
  string, string, { rejectValue: string }
>("strategicPlan/delete", async (id, { rejectWithValue }) => {
  try {
    await strategicPlanService.deleteStrategicPlan(id);
    return id;
  } catch (err) {
    return rejectWithValue(getErr(err));
  }
});

// ─── OBJECTIVE THUNKS ─────────────────────────────────────────────────────────

export const addObjective = createAsyncThunk <
  { planId: string; objective: IObjective },
  { planId: string; title: string },
  { rejectValue: string }
>("strategicPlan/addObjective", async ({ planId, title }, { rejectWithValue }) => {
  try {
    const response = await strategicPlanService.addObjective(planId, title);
    return { planId, objective: response.data };
  } catch (err) {
    return rejectWithValue(getErr(err));
  }
});

export const updateObjective = createAsyncThunk <
  { planId: string; objective: IObjective },
  { planId: string; objectiveId: string; title: string },
  { rejectValue: string }
>("strategicPlan/updateObjective", async ({ planId, objectiveId, title }, { rejectWithValue }) => {
  try {
    const response = await strategicPlanService.updateObjective(objectiveId, title);
    return { planId, objective: response.data };
  } catch (err) {
    return rejectWithValue(getErr(err));
  }
});

// ─── ACTIVITY THUNKS ──────────────────────────────────────────────────────────

export const addActivity = createAsyncThunk <
  { planId: string; objectiveId: string; activity: IActivity },
  { planId: string; objectiveId: string; description: string },
  { rejectValue: string }
>("strategicPlan/addActivity", async ({ planId, objectiveId, description }, { rejectWithValue }) => {
  try {
    const response = await strategicPlanService.addActivity(objectiveId, description);
    return { planId, objectiveId, activity: response.data };
  } catch (err) {
    return rejectWithValue(getErr(err));
  }
});

export const updateActivity = createAsyncThunk <
  { planId: string; objectiveId: string; activity: IActivity },
  { planId: string; objectiveId: string; activityId: string; description: string },
  { rejectValue: string }
>("strategicPlan/updateActivity", async ({ planId, objectiveId, activityId, description }, { rejectWithValue }) => {
  try {
    const response = await strategicPlanService.updateActivity(activityId, description);
    return { planId, objectiveId, activity: response.data };
  } catch (err) {
    return rejectWithValue(getErr(err));
  }
});

// ─── INDICATOR LOOKUP THUNK ───────────────────────────────────────────────────

export const fetchIndicatorByActivity = createAsyncThunk <
  { activityId: string; indicator: IActivityIndicator | null },
  string,
  { rejectValue: string }
>("strategicPlan/fetchIndicatorByActivity", async (activityId, { rejectWithValue }) => {
  try {
    const response = await strategicPlanService.getIndicatorByActivity(activityId);
    return { activityId, indicator: response.data };
  } catch (err) {
    return rejectWithValue(getErr(err));
  }
});

// ─── SLICE ────────────────────────────────────────────────────────────────────

const strategicPlanSlice = createSlice({
  name: "strategicPlan",
  initialState,
  reducers: {
    resetStrategicPlanState: () => initialState,
    clearError: (state) => { state.error = null; },
  },
  extraReducers: (builder) => {
    builder
      // ── Plans ──
      .addCase(getAllStrategicPlans.fulfilled, (state, action) => {
        state.plans = action.payload;
      })
      .addCase(createPlan.fulfilled, (state, action) => {
        state.plans.unshift(action.payload);
      })
      .addCase(updatePlan.fulfilled, (state, action) => {
        const idx = state.plans.findIndex((p) => p.id === action.payload.id);
        if (idx !== -1) state.plans[idx] = action.payload;
      })
      .addCase(deletePlan.fulfilled, (state, action) => {
        state.plans = state.plans.filter((p) => p.id !== action.payload);
      })

      // ── Objectives ──
      .addCase(addObjective.fulfilled, (state, action) => {
        const plan = state.plans.find((p) => p.id === action.payload.planId);
        if (plan) {
          plan.objectives = [
            ...( plan.objectives ?? []),
            { ...action.payload.objective, activities: [] },
          ];
        }
      })
      .addCase(updateObjective.fulfilled, (state, action) => {
        const plan = state.plans.find((p) => p.id === action.payload.planId);
        if (plan) {
          const idx = plan.objectives.findIndex(
            (o) => o.id === action.payload.objective.id
          );
          if (idx !== -1) {
            // Preserve activities — backend only returns the objective row
            plan.objectives[idx] = {
              ...plan.objectives[idx],
              title: action.payload.objective.title,
            };
          }
        }
      })

      // ── Activities ──
      .addCase(addActivity.fulfilled, (state, action) => {
        const plan = state.plans.find((p) => p.id === action.payload.planId);
        if (plan) {
          const obj = plan.objectives.find(
            (o) => o.id === action.payload.objectiveId
          );
          if (obj) {
            obj.activities = [...(obj.activities ?? []), action.payload.activity];
          }
        }
      })
      .addCase(updateActivity.fulfilled, (state, action) => {
        const plan = state.plans.find((p) => p.id === action.payload.planId);
        if (plan) {
          const obj = plan.objectives.find(
            (o) => o.id === action.payload.objectiveId
          );
          if (obj) {
            const idx = obj.activities.findIndex(
              (a) => a.id === action.payload.activity.id
            );
            if (idx !== -1) {
              obj.activities[idx] = {
                ...obj.activities[idx],
                description: action.payload.activity.description,
              };
            }
          }
        }
      })

      // ── Indicator lookup ──
      .addCase(fetchIndicatorByActivity.fulfilled, (state, action) => {
        state.activityIndicators[action.payload.activityId] = action.payload.indicator;
      })

      // ── Global matchers ──
      .addMatcher(
        (action) =>
          action.type.startsWith("strategicPlan/") &&
          action.type.endsWith("/pending"),
        (state, action) => {
          // Use actionLoading for mutations, loading for fetches
          if (action.type === "strategicPlan/getAll/pending") {
            state.loading = true;
          } else {
            state.actionLoading = true;
          }
          state.error = null;
        }
      )
      .addMatcher(
        (action) =>
          action.type.startsWith("strategicPlan/") &&
          action.type.endsWith("/fulfilled"),
        (state) => {
          state.loading = false;
          state.actionLoading = false;
        }
      )
      .addMatcher(
        (action) =>
          action.type.startsWith("strategicPlan/") &&
          action.type.endsWith("/rejected"),
        (state, action: PayloadAction<string | undefined>) => {
          state.loading = false;
          state.actionLoading = false;
          state.error = action.payload ?? "An unexpected error occurred";
        }
      );
  },
});

export const { resetStrategicPlanState, clearError } = strategicPlanSlice.actions;
export default strategicPlanSlice.reducer;