import { apiPrivate } from "../../../api/axios";

export interface IActivity {
  id: string;
  objectiveId?: string;
  description: string;
  status?: "Pending" | "In Progress" | "Completed";
  reviewStatus?: "Pending" | "Accepted" | "Rejected";
  createdAt?: string;
}

export interface IObjective {
  id: string;
  planId?: string;
  title: string;
  activities: IActivity[];
  weight?: number;
  unit?: string;
  createdAt?: string;
}

export interface IStrategicPlan {
  id: string;
  perspective: string;
  objectives: IObjective[];
  objectiveCount?: number;
  createdByName?: string;
  createdAt?: string;
  updatedAt?: string;
}

export interface IActivityIndicator {
  id: string;
  status: string;
  progress: number;
  target: number;
  unit: string;
  deadline: string | null;
  assigneeId: string | null;
  assignmentType: string | null;
  reportingCycle: string;
  activeQuarter: number;
  assigneeDisplayName: string | null;
}

interface IApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

// ─── PLANS ────────────────────────────────────────────────────────────────────

export const createStrategicPlan = async (
  data: Partial<IStrategicPlan>
): Promise<IApiResponse<IStrategicPlan>> => {
  const response = await apiPrivate.post("/strategic-plans", data);
  return response.data;
};

export const fetchAllStrategicPlans = async (): Promise<IApiResponse<IStrategicPlan[]>> => {
  const response = await apiPrivate.get("/strategic-plans");
  return response.data;
};

export const fetchStrategicPlanById = async (
  id: string
): Promise<IApiResponse<IStrategicPlan>> => {
  const response = await apiPrivate.get(`/strategic-plans/${id}`);
  return response.data;
};

export const updateStrategicPlan = async (
  id: string,
  data: Partial<IStrategicPlan>
): Promise<IApiResponse<IStrategicPlan>> => {
  const response = await apiPrivate.patch(`/strategic-plans/${id}`, data);
  return response.data;
};

export const deleteStrategicPlan = async (
  id: string
): Promise<IApiResponse<void>> => {
  const response = await apiPrivate.delete(`/strategic-plans/${id}`);
  return response.data;
};

// ─── OBJECTIVES ───────────────────────────────────────────────────────────────

export const addObjective = async (
  planId: string,
  title: string
): Promise<IApiResponse<IObjective>> => {
  const response = await apiPrivate.post(`/strategic-plans/${planId}/objectives`, { title });
  return response.data;
};

export const updateObjective = async (
  objectiveId: string,
  title: string
): Promise<IApiResponse<IObjective>> => {
  const response = await apiPrivate.patch(`/strategic-plans/objectives/${objectiveId}`, { title });
  return response.data;
};

// ─── ACTIVITIES ───────────────────────────────────────────────────────────────

export const addActivity = async (
  objectiveId: string,
  description: string
): Promise<IApiResponse<IActivity>> => {
  console.log(`[addActivity] Adding activity to objective ${objectiveId}: "${description}"`);
  
  const response = await apiPrivate.post(
    `/strategic-plans/objectives/${objectiveId}/activities`,
    { description }
  );
  
  console.log("[addActivity] Response received:", response.data);
  return response.data;
};

export const updateActivity = async (
  activityId: string,
  description: string
): Promise<IApiResponse<IActivity>> => {
  const response = await apiPrivate.patch(
    `/strategic-plans/activities/${activityId}`,
    { description }
  );
  return response.data;
};

// ─── INDICATOR LOOKUP ─────────────────────────────────────────────────────────

export const getIndicatorByActivity = async (
  activityId: string
): Promise<IApiResponse<IActivityIndicator | null> & { hasIndicator: boolean }> => {
  const response = await apiPrivate.get(
    `/strategic-plans/activities/${activityId}/indicator`
  );
  return response.data;
};