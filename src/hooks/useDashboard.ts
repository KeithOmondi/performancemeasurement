import { useEffect } from "react";
import { useDispatch, useSelector } from "react-redux";
import { fetchDashboardStats } from "../store/slices/dashboardSlice";
import type {
  IDashboardData,
  IDashboardStats,
  IPerspectiveStat,
  IRecentSubmission,
} from "../store/slices/dashboardSlice";
import type { AppDispatch, RootState } from "../store/store";

// Re-export for convenience
export type { IDashboardData, IDashboardStats, IPerspectiveStat, IRecentSubmission };

export function useDashboard() {
  const dispatch = useDispatch<AppDispatch>();
  const { data, loading, error } = useSelector((state: RootState) => state.dashboard);

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  const refetch = () => {
    dispatch(fetchDashboardStats());
  };

  return { data, loading, error, refetch };
}