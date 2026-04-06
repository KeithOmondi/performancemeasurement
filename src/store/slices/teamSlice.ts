import { createSlice, createAsyncThunk, type PayloadAction } from "@reduxjs/toolkit";
import { apiPrivate } from "../../api/axios";

/* ------------------------------------------------------------------ */
/*  Types                                                               */
/* ------------------------------------------------------------------ */

export interface ITeamMember {
  id: string;        // ✅ PostgreSQL returns id, not _id
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
  is_active?: boolean;   // ← add this if your API returns snake_case
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
/*  Helpers                                                             */
/* ------------------------------------------------------------------ */

const getErrorMessage = (error: any): string =>
  error?.response?.data?.message || "An unexpected error occurred";

/* ------------------------------------------------------------------ */
/*  Thunks                                                              */
/* ------------------------------------------------------------------ */

export const fetchTeams = createAsyncThunk(
  "teams/fetchAll",
  async (_: void, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.get("/teams");
      const teams = res.data.data.map((t: any) => ({
        ...t,
        isActive: t.isActive ?? t.is_active,  // normalize here
      }));
      return teams as ITeam[];
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const createTeam = createAsyncThunk(
  "teams/create",
  async (
    data: { name: string; description?: string; teamLead: string; members: string[] },
    { rejectWithValue },
  ) => {
    try {
      const res = await apiPrivate.post("/teams", data);
      return res.data.data as ITeam;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const updateTeam = createAsyncThunk(
  "teams/update",
  async (
    arg: { id: string; data: { name?: string; description?: string; teamLead?: string } },
    { rejectWithValue },
  ) => {
    try {
      const res = await apiPrivate.patch(`/teams/${arg.id}`, arg.data);
      return res.data.data as ITeam;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const addTeamMembers = createAsyncThunk(
  "teams/addMembers",
  async (arg: { id: string; memberIds: string[] }, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.patch(`/teams/${arg.id}/members/add`, {
        memberIds: arg.memberIds,
      });
      return res.data.data as ITeam;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const removeTeamMembers = createAsyncThunk(
  "teams/removeMembers",
  async (arg: { id: string; memberIds: string[] }, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.patch(`/teams/${arg.id}/members/remove`, {
        memberIds: arg.memberIds,
      });
      return res.data.data as ITeam;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
);

export const setTeamActiveStatus = createAsyncThunk(
  "teams/setStatus",
  async (arg: { id: string; isActive: boolean }, { rejectWithValue }) => {
    try {
      const res = await apiPrivate.patch(`/teams/${arg.id}/status`, {
        isActive: arg.isActive,
      });
      return res.data.data as ITeam;
    } catch (err) {
      return rejectWithValue(getErrorMessage(err));
    }
  },
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
  },
);

/* ------------------------------------------------------------------ */
/*  Slice                                                               */
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
    const setActionLoading = (state: TeamState) => {
      state.actionLoading = true;
      state.error = null;
    };

    const upsertTeam = (state: TeamState, action: PayloadAction<ITeam>) => {
      state.actionLoading = false;
      // ✅ Use .id not ._id
      const idx = state.teams.findIndex((t) => t.id === action.payload.id);
      if (idx !== -1) state.teams[idx] = action.payload;
      else state.teams.unshift(action.payload);
    };

    builder
      // fetch
      .addCase(fetchTeams.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTeams.fulfilled, (state, action: PayloadAction<ITeam[]>) => {
        state.loading = false;
        state.teams = action.payload;
      })
      .addCase(fetchTeams.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      // create
      .addCase(createTeam.pending, setActionLoading)
      .addCase(createTeam.fulfilled, upsertTeam)
      .addCase(createTeam.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      })
      // update
      .addCase(updateTeam.pending, setActionLoading)
      .addCase(updateTeam.fulfilled, upsertTeam)
      .addCase(updateTeam.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      })
      // addMembers
      .addCase(addTeamMembers.pending, setActionLoading)
      .addCase(addTeamMembers.fulfilled, upsertTeam)
      .addCase(addTeamMembers.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      })
      // removeMembers
      .addCase(removeTeamMembers.pending, setActionLoading)
      .addCase(removeTeamMembers.fulfilled, upsertTeam)
      .addCase(removeTeamMembers.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      })
      // setStatus
      .addCase(setTeamActiveStatus.pending, setActionLoading)
      .addCase(setTeamActiveStatus.fulfilled, upsertTeam)
      .addCase(setTeamActiveStatus.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      })
      // delete
      .addCase(deleteTeam.pending, setActionLoading)
      .addCase(deleteTeam.fulfilled, (state, action: PayloadAction<string>) => {
        state.actionLoading = false;
        // ✅ Use .id not ._id
        state.teams = state.teams.filter((t) => t.id !== action.payload);
      })
      .addCase(deleteTeam.rejected, (state, action) => {
        state.actionLoading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearTeamError } = teamSlice.actions;
export default teamSlice.reducer;