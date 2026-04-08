import { createSlice, createAsyncThunk, type PayloadAction, isAnyOf } from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ─── TYPES ────────────────────────────────────────────────────────── */

export interface ITeamMember {
  id: string; 
  name: string;
  email: string;
  title?: string;
  pjNumber?: string;
  role?: string;
}

export interface ITeam {
  id: string;
  name: string;
  description?: string;
  teamLead?: ITeamMember;
  teamLeadId?: string;
  leadName?: string;
  leadEmail?: string;
  members: ITeamMember[];
  createdBy?: string;
  creatorName?: string;
  isActive?: boolean;
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
}

/**
 * Interface for backend responses that might use snake_case
 * or have missing optional fields.
 */
interface IRawTeam extends Partial<ITeam> {
  is_active?: boolean;
  created_at?: string;
  updated_at?: string;
  members?: ITeamMember[];
}

interface TeamState {
  teams: ITeam[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

interface KnownError {
  response?: { data?: { message?: string } };
  message?: string;
}

/* ─── INITIAL STATE ────────────────────────────────────────────────── */

const initialState: TeamState = {
  teams: [],
  loading: false,
  actionLoading: false,
  error: null,
};

/* ─── HELPERS ──────────────────────────────────────────────────────── */

const getErrorMessage = (error: unknown): string => {
  const err = error as KnownError;
  return err.response?.data?.message || err.message || "An unexpected error occurred";
};

/**
 * Normalization Engine: 
 * Converts Raw backend data into strict ITeam format.
 */
const normalizeTeam = (t: IRawTeam): ITeam => {
  // Extract snake_case fields for mapping
  const { 
    is_active, 
    created_at, 
    updated_at, 
    members: rawMembers, 
    ...rest 
  } = t;

  return {
    ...(rest as ITeam),
    id: t.id || "",
    name: t.name || "Unnamed Team",
    
    // CRITICAL FIX: Ensure members is never undefined/null for .slice() calls
    members: Array.isArray(rawMembers) ? rawMembers : [],
    
    // Mapping keys
    isActive: t.isActive ?? is_active ?? true,
    createdAt: t.createdAt ?? created_at,
    updatedAt: t.updatedAt ?? updated_at,
    
    // Lead Fallbacks
    leadName: t.leadName ?? t.teamLead?.name ?? "Unknown Lead",
    leadEmail: t.leadEmail ?? t.teamLead?.email,
  };
};

/* ─── THUNKS ───────────────────────────────────────────────────────── */

export const fetchTeams = createAsyncThunk<ITeam[], void, { rejectValue: string }>(
  "teams/fetchAll",
  async (_, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get<{ data: IRawTeam[] }>("/teams");
      return (res.data.data || []).map(normalizeTeam);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const createTeam = createAsyncThunk<
  ITeam,
  { name: string; description?: string; teamLead: string; members: string[] },
  { rejectValue: string }
>("teams/create", async (data, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.post<{ data: IRawTeam }>("/teams", data);
    return normalizeTeam(res.data.data);
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const updateTeam = createAsyncThunk<
  ITeam,
  { id: string; data: { name?: string; description?: string; teamLead?: string } },
  { rejectValue: string }
>("teams/update", async (arg, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.patch<{ data: IRawTeam }>(`/teams/${arg.id}`, arg.data);
    return normalizeTeam(res.data.data);
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const addTeamMembers = createAsyncThunk<
  ITeam,
  { id: string; memberIds: string[] },
  { rejectValue: string }
>("teams/addMembers", async (arg, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.patch<{ data: IRawTeam }>(`/teams/${arg.id}/members/add`, {
      memberIds: arg.memberIds,
    });
    return normalizeTeam(res.data.data);
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const removeTeamMembers = createAsyncThunk<
  ITeam,
  { id: string; memberIds: string[] },
  { rejectValue: string }
>("teams/removeMembers", async (arg, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.patch<{ data: IRawTeam }>(`/teams/${arg.id}/members/remove`, {
      memberIds: arg.memberIds,
    });
    return normalizeTeam(res.data.data);
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const setTeamActiveStatus = createAsyncThunk<
  ITeam,
  { id: string; isActive: boolean },
  { rejectValue: string }
>("teams/setStatus", async (arg, { rejectWithValue }) => {
  try {
    const res = await apiPrivate.patch<{ data: IRawTeam }>(`/teams/${arg.id}/status`, {
      isActive: arg.isActive,
    });
    return normalizeTeam(res.data.data);
  } catch (err) {
    return rejectWithValue(getErrorMessage(err));
  }
});

export const deleteTeam = createAsyncThunk<string, string, { rejectValue: string }>(
  "teams/delete",
  async (id, { rejectWithValue }) => {
    try {
      await apiPrivate.delete(`/teams/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/* ─── SLICE ────────────────────────────────────────────────────────── */

const teamSlice = createSlice({
  name: "teams",
  initialState,
  reducers: {
    clearTeamError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    const setActionLoading = (state: TeamState) => {
      state.actionLoading = true;
      state.error = null;
    };

    const handleActionError = (state: TeamState, action: PayloadAction<string | undefined>) => {
      state.actionLoading = false;
      state.error = action.payload ?? "An unexpected error occurred";
    };

    const upsertTeam = (state: TeamState, action: PayloadAction<ITeam>) => {
      state.actionLoading = false;
      const teamData = action.payload; // Already normalized by Thunks
      
      const idx = state.teams.findIndex((t) => t.id === teamData.id);
      if (idx !== -1) {
        state.teams[idx] = { ...state.teams[idx], ...teamData };
      } else {
        state.teams.unshift(teamData);
      }
    };

    builder
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action) => {
        state.loading = false;
        state.teams = action.payload; 
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload ?? "Failed to load teams";
      })
      .addCase(deleteTeam.pending, setActionLoading)
      .addCase(deleteTeam.fulfilled, (state, action) => {
        state.actionLoading = false;
        state.teams = state.teams.filter((t) => t.id !== action.payload);
      })
      .addCase(deleteTeam.rejected, handleActionError)

      .addMatcher(
        isAnyOf(
          createTeam.pending,
          updateTeam.pending,
          addTeamMembers.pending,
          removeTeamMembers.pending,
          setTeamActiveStatus.pending
        ),
        setActionLoading
      )
      .addMatcher(
        isAnyOf(
          createTeam.fulfilled,
          updateTeam.fulfilled,
          addTeamMembers.fulfilled,
          removeTeamMembers.fulfilled,
          setTeamActiveStatus.fulfilled
        ),
        upsertTeam
      )
      .addMatcher(
        isAnyOf(
          createTeam.rejected,
          updateTeam.rejected,
          addTeamMembers.rejected,
          removeTeamMembers.rejected,
          setTeamActiveStatus.rejected
        ),
        handleActionError
      );
  },
});

export const { clearTeamError } = teamSlice.actions;
export default teamSlice.reducer;