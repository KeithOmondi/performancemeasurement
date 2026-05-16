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

/* ─── Re-export types so consumers import from one place ─────────────────── */
export type { IDashboardData, IDashboardStats, IPerspectiveStat, IRecentSubmission };

/* ─── Hook ───────────────────────────────────────────────────────────────── */

/**
 * useDashboard
 *
 * Wraps the dashboardSlice — uses apiPrivate (auth headers + interceptors)
 * and dispatches fetchDashboardStats exactly once per mount.
 *
 * Usage:
 *   const { data, loading, error, refetch } = useDashboard();
 *
 *   data.stats.total
 *   data.stats.pendingReview
 *   data.perspectives        // by-perspective breakdown
 *   data.recentSubmissions   // last 10 submissions
 */
export function useDashboard() {
  const dispatch = useDispatch<AppDispatch>();

  const { data, loading, error } = useSelector(
    (state: RootState) => state.dashboard
  );

  useEffect(() => {
    dispatch(fetchDashboardStats());
  }, [dispatch]);

  const refetch = () => {
    dispatch(fetchDashboardStats());
  };

  return { data, loading, error, refetch };
}