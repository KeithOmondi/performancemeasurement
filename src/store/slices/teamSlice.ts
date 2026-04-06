import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ------------------------------------------------------------------ */
/* Types                                                             */
/* ------------------------------------------------------------------ */

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
  is_active?: boolean;
  memberCount?: number;
  createdAt?: string;
  updatedAt?: string;
  created_at?: string;
  updated_at?: string;
}

interface TeamState {
  teams: ITeam[];
  loading: boolean;
  actionLoading: boolean;
  error: string | null;
}

const initialState: TeamState = {
  teams: [],
  loading: false,
  actionLoading: false,
  error: null,
};

/* ------------------------------------------------------------------ */
/* Helpers                                                           */
/* ------------------------------------------------------------------ */

const getErrorMessage = (error: any): string =>
  error?.response?.data?.message || "An unexpected error occurred";

/**
 * Normalizes backend data (PostgreSQL/Snake Case) to Frontend (Camel Case)
 */
const normalizeTeam = (t: any): ITeam => ({
  ...t,
  isActive: t.isActive ?? t.is_active ?? true,
  createdAt: t.createdAt ?? t.created_at,
  updatedAt: t.updatedAt ?? t.updated_at,
});

/* ------------------------------------------------------------------ */
/* Thunks                                                            */
/* ------------------------------------------------------------------ */

export const fetchTeams = createAsyncThunk(
  "teams/fetchAll",
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/teams");
      // Normalize the entire array on fetch
      const teams = (res.data.data || []).map(normalizeTeam);
      return teams as ITeam[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const createTeam = createAsyncThunk(
  "teams/create",
  async (
    data: { name: string; description?: string; teamLead: string; members: string[] },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiPrivate.post("/teams", data);
      return normalizeTeam(res.data.data);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const updateTeam = createAsyncThunk(
  "teams/update",
  async (
    arg: { id: string; data: { name?: string; description?: string; teamLead?: string } },
    { rejectWithValue }
  ) => {
    try {
      const res = await apiPrivate.patch(`/teams/${arg.id}`, arg.data);
      return normalizeTeam(res.data.data);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const addTeamMembers = createAsyncThunk(
  "teams/addMembers",
  async (arg: { id: string; memberIds: string[] }, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.patch(`/teams/${arg.id}/members/add`, {
        memberIds: arg.memberIds,
      });
      return normalizeTeam(res.data.data);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const removeTeamMembers = createAsyncThunk(
  "teams/removeMembers",
  async (arg: { id: string; memberIds: string[] }, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.patch(`/teams/${arg.id}/members/remove`, {
        memberIds: arg.memberIds,
      });
      return normalizeTeam(res.data.data);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const setTeamActiveStatus = createAsyncThunk(
  "teams/setStatus",
  async (arg: { id: string; isActive: boolean }, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.patch(`/teams/${arg.id}/status`, {
        isActive: arg.isActive,
      });
      return normalizeTeam(res.data.data);
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

export const deleteTeam = createAsyncThunk(
  "teams/delete",
  async (id: string, { rejectWithValue }) => {
    try {
      await apiPrivate.delete(`/teams/${id}`);
      return id;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  }
);

/* ------------------------------------------------------------------ */
/* Slice                                                             */
/* ------------------------------------------------------------------ */

const teamSlice = createSlice({
  name: "teams",
  initialState,
  reducers: {
    clearTeamError: (state) => {
      state.error = null;
    },
  },
 extraReducers: (builder) => {
    // 1. Define explicit types for your internal helpers to fix the 'any' errors
    const setActionLoading = (state: TeamState) => {
      state.actionLoading = true;
      state.error = null;
    };

    const handleActionError = (state: TeamState, action: any) => {
      state.actionLoading = false;
      state.error = action.payload as string;
    };

    const upsertTeam = (state: TeamState, action: PayloadAction<ITeam>) => {
      state.actionLoading = false;
      const idx = state.teams.findIndex((t: ITeam) => t.id === action.payload.id);
      if (idx !== -1) {
        state.teams[idx] = { ...state.teams[idx], ...action.payload };
      } else {
        state.teams.unshift(action.payload);
      }
    };

    builder
      // 2. ALWAYS put .addCase calls BEFORE .addMatcher calls
      .addCase(fetchTeams.pending, (state: TeamState) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state: TeamState, action: PayloadAction<ITeam[]>) => {
        state.loading = false;
        state.teams = action.payload;
      })
      .addCase(fetchTeams.rejected, (state: TeamState, action: any) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      .addCase(deleteTeam.pending, setActionLoading)
      .addCase(deleteTeam.fulfilled, (state: TeamState, action: PayloadAction<string>) => {
        state.actionLoading = false;
        state.teams = state.teams.filter((t: ITeam) => t.id !== action.payload);
      })
      .addCase(deleteTeam.rejected, handleActionError)

      // 3. Matchers go at the end of the chain
      .addMatcher(
        (action) =>
          [
            createTeam.pending.type,
            updateTeam.pending.type,
            addTeamMembers.pending.type,
            removeTeamMembers.pending.type,
            setTeamActiveStatus.pending.type,
          ].includes(action.type),
        setActionLoading
      )
      .addMatcher(
        (action) =>
          [
            createTeam.fulfilled.type,
            updateTeam.fulfilled.type,
            addTeamMembers.fulfilled.type,
            removeTeamMembers.fulfilled.type,
            setTeamActiveStatus.fulfilled.type,
          ].includes(action.type),
        upsertTeam
      )
      .addMatcher(
        (action) =>
          [
            createTeam.rejected.type,
            updateTeam.rejected.type,
            addTeamMembers.rejected.type,
            removeTeamMembers.rejected.type,
            setTeamActiveStatus.rejected.type,
          ].includes(action.type),
        handleActionError
      );
  },
});

export const { clearTeamError } = teamSlice.actions;
export default teamSlice.reducer;