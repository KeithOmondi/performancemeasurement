import { api } from "../../../api/axios";

/* ---------------- TYPES ---------------- */
export interface IActivity {
  _id: string; // Now mandatory as backend generates these
  description: string;
}

export interface IObjective {
  _id: string; // Now mandatory
  title: string;
  activities: IActivity[];
  weight: number; // <--- Add this
  unit: string;
  target?: number;
}

export interface IStrategicPlan {
  _id: string;
  perspective: string;
  objectives: IObjective[];
  createdAt?: string;
  updatedAt?: string;
}

interface IApiResponse<T> {
  success: boolean;
  message?: string;
  count?: number;
  data: T;
}

/* ---------------- API CALLS ---------------- */
// URLs updated to match RESTful backend: /strategic-plans/
export const createStrategicPlan = async (
  data: Partial<IStrategicPlan>,
): Promise<IApiResponse<IStrategicPlan>> => {
  const response = await api.post("/strategic-plans", data);
  return response.data;
};

export const fetchAllStrategicPlans = async (): Promise<
  IApiResponse<IStrategicPlan[]>
> => {
  const response = await api.get("/strategic-plans");
  return response.data;
};

export const fetchStrategicPlanById = async (
  id: string,
): Promise<IApiResponse<IStrategicPlan>> => {
  const response = await api.get(`/strategic-plans/${id}`);
  return response.data;
};

export const updateStrategicPlan = async (
  id: string,
  data: Partial<IStrategicPlan>,
): Promise<IApiResponse<IStrategicPlan>> => {
  const response = await api.patch(`/strategic-plans/${id}`, data);
  return response.data;
};

export const deleteStrategicPlan = async (
  id: string,
): Promise<IApiResponse<void>> => {
  const response = await api.delete(`/strategic-plans/${id}`);
  return response.data;
};
