import { apiPrivate } from "../../../api/axios";

export interface IActivity {
  _id: string;
  description: string;
  status?: "Pending" | "In Progress" | "Completed";
  reviewStatus?: "Pending" | "Accepted" | "Rejected";
}

export interface IObjective {
  _id: string;
  title: string;
  activities: IActivity[];
  weight?: number;
  unit?: string;
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