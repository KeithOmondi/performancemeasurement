import { useEffect, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { checkAuth } from "./store/slices/auth/authSlice";

// Layouts
import ProtectedRoute from "./routes/ProtectedRoute";
import SuperAdminLayout from "./components/superadmin/SuperAdminLayout";
import AdminLayout from "./components/admin/AdminLayout";
import UserLayout from "./components/user/UserLayout";

// Auth
import LoginPage from "./pages/auth/Login";

// SuperAdmin pages
import SuperAdminDashboardPage from "./pages/superadmin/SuperAdminDashboard";
import SuperAdminMembers from "./pages/superadmin/SuperAdminMembers";
import SuperAdminIndicators from "./pages/superadmin/SuperAdminIndicators";
import SuperAdminSubmissions from "./pages/superadmin/SuperAdminSubmissions";
import SuperAdminReports from "./pages/superadmin/SuperAdminReports";
import SuperAdminReviewer from "./pages/superadmin/SuperAdminReviewer";
import SuperAdminSettings from "./pages/superadmin/SuperAdminSettings";
import SuperAdminExaminers from "./pages/superadmin/SuperAdminExaminers";
import SuperAdminRegistry from "./pages/superadmin/SuperAdminRegistry";

// Admin pages
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminIndicators from "./pages/admin/AdminIndicators";
import AdminPendingReviews from "./pages/admin/AdminPendingReviews";
import AdminRejections from "./pages/admin/AdminRejections";
import AdminApprovals from "./pages/admin/AdminApprovals";

// User pages
import UserDashboard from "./pages/user/UserDashboard";
import UserTasks from "./pages/user/UserTasks";
import UserRejections from "./pages/user/UserRejections";
import UserHistory from "./pages/user/UserHistory";
import UserApprovals from "./pages/user/userApprovals";
import UserTaskIdPage from "./pages/user/UserTaskIdPage";
import SuperAdminTeams from "./pages/superadmin/Superadminteams";

const HOME_ROUTES: Record<string, string> = {
  superadmin: "/superadmin/dashboard",
  admin: "/admin/dashboard",
  examiner: "/admin/dashboard",
  user: "/user/dashboard",
};

const App = () => {
  const dispatch = useAppDispatch();
  const { user, isCheckingAuth } = useAppSelector((state) => state.auth);

  useEffect(() => {
    dispatch(checkAuth());
  }, [dispatch]);

  const homeRoute = useMemo(
    () => (user ? HOME_ROUTES[user.role] ?? "/login" : "/login"),
    [user]
  );

  if (isCheckingAuth) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#fcfcf7]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#eab308] mb-4" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Verifying Session
        </p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* ── Public ─────────────────────────────────────────────────── */}
        <Route
          path="/login"
          element={!user ? <LoginPage /> : <Navigate to={homeRoute} replace />}
        />

        {/* ── SuperAdmin ──────────────────────────────────────────────── */}
        <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
          <Route element={<SuperAdminLayout />}>
            <Route path="/superadmin/dashboard" element={<SuperAdminDashboardPage />} />
            <Route path="/superadmin/team" element={<SuperAdminMembers />} />
            <Route path="/superadmin/indicators" element={<SuperAdminIndicators />} />
            <Route path="/superadmin/submissions" element={<SuperAdminSubmissions />} />
            <Route path="/superadmin/reports" element={<SuperAdminReports />} />
            <Route path="/superadmin/reviewer" element={<SuperAdminReviewer />} />
            <Route path="/superadmin/settings" element={<SuperAdminSettings />} />
            <Route path="/superadmin/examiner" element={<SuperAdminExaminers />} />
            <Route path="/superadmin/registry" element={<SuperAdminRegistry />} />
            <Route path="/superadmin/teams" element={<SuperAdminTeams />} />
          </Route>
        </Route>

        {/* ── Admin & Examiner ────────────────────────────────────────── */}
        <Route element={<ProtectedRoute allowedRoles={["admin", "examiner"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/indicators/all" element={<AdminIndicators />} />
            <Route path="/admin/reviews" element={<AdminPendingReviews />} />
            <Route path="/admin/rejects" element={<AdminRejections />} />
            <Route path="/admin/approvals" element={<AdminApprovals />} />
          </Route>
        </Route>

        {/* ── User ────────────────────────────────────────────────────── */}
        <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
          <Route element={<UserLayout />}>
            <Route path="/user/dashboard" element={<UserDashboard />} />
            <Route path="/user/assignments" element={<UserTasks />} />
            <Route path="/user/assignments/:id" element={<UserTaskIdPage />} />
            <Route path="/user/rejects" element={<UserRejections />} />
            <Route path="/user/history" element={<UserHistory />} />
            <Route path="/user/approvals" element={<UserApprovals />} />
          </Route>
        </Route>

        {/* ── Fallbacks ───────────────────────────────────────────────── */}
        <Route path="/" element={<Navigate to={homeRoute} replace />} />
        <Route path="*" element={<Navigate to={homeRoute} replace />} />
      </Routes>
    </Router>
  );
};

export default App;