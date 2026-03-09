import { useEffect, useMemo } from "react";
import { BrowserRouter as Router, Routes, Route, Navigate } from "react-router-dom";
import { useAppDispatch, useAppSelector } from "./store/hooks";
import { authService } from "./store/slices/auth/authService";
import { setAuthChecked } from "./store/slices/auth/authSlice";

// Components & Layouts
import ProtectedRoute from "./routes/ProtectedRoute";
import SuperAdminLayout from "./components/superadmin/SuperAdminLayout";
import AdminLayout from "./components/admin/AdminLayout";
import UserLayout from "./components/user/UserLayout";

// Pages
import LoginPage from "./pages/auth/Login";
import SuperAdminDashboardPage from "./pages/superadmin/SuperAdminDashboard";
import SuperAdminMembers from "./pages/superadmin/SuperAdminMembers";
import SuperAdminIndicators from "./pages/superadmin/SuperAdminIndicators";
import UserDashboard from "./pages/user/UserDashboard";
import UserTasks from "./pages/user/UserTasks";
import AdminDashboard from "./pages/admin/AdminDashboard";
import AdminIndicators from "./pages/admin/AdminIndicators";
import SuperAdminSubmissions from "./pages/superadmin/SuperAdminSubmissions";
import SuperAdminReports from "./pages/superadmin/SuperAdminReports";
import SuperAdminReviewer from "./pages/superadmin/SuperAdminReviewer";
import AdminPendingReviews from "./pages/admin/AdminPendingReviews";
import UserRejections from "./pages/user/UserRejections";
import UserHistory from "./pages/user/UserHistory";
import AdminRejections from "./pages/admin/AdminRejections";
import AdminApprovals from "./pages/admin/AdminApprovals";
import UserApprovals from "./pages/user/userApprovals";

const App = () => {
  const dispatch = useAppDispatch();
  const { user, isCheckingAuth } = useAppSelector((state) => state.auth);

  useEffect(() => {
  const verifySession = async () => {
    try {
      const userData = await authService.checkAuth();
      dispatch(setAuthChecked(userData));
    } catch {
      dispatch(setAuthChecked(null));
    }
  };

  verifySession();
}, [dispatch]);

  const homeRoute = useMemo(() => {
    if (!user) return "/login";
    const routes = {
      superadmin: "/superadmin/dashboard",
      admin: "/admin/dashboard",
      reviewer: "/reviewer/dashboard",
      user: "/user/dashboard",
    };
    return routes[user.role as keyof typeof routes] || "/login";
  }, [user]);

  if (isCheckingAuth) {
    return (
      <div className="h-screen w-full flex flex-col items-center justify-center bg-[#fcfcf7]">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-[#d4af37] mb-4" />
        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-[0.2em]">
          Verifying Session
        </p>
      </div>
    );
  }

  return (
    <Router>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={!user ? <LoginPage /> : <Navigate to={homeRoute} replace />}
        />

        {/* 🔹 SUPER ADMIN ROUTES */}
        <Route element={<ProtectedRoute allowedRoles={["superadmin"]} />}>
          <Route element={<SuperAdminLayout />}>
            <Route path="/superadmin/dashboard" element={<SuperAdminDashboardPage />} />
            <Route path="/superadmin/team" element={<SuperAdminMembers />} />
            <Route path="/superadmin/indicators" element={<SuperAdminIndicators />} />
            <Route path="/superadmin/submissions" element={<SuperAdminSubmissions />} />
            <Route path="/superadmin/reports" element={<SuperAdminReports />} />
            <Route path="/superadmin/reviewer" element={<SuperAdminReviewer />} />
          </Route>
        </Route>

        {/* 🔹 ADMIN ROUTES */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/admin/dashboard" element={<AdminDashboard />} />
            <Route path="/admin/indicators/all" element={<AdminIndicators />} />
            <Route path="/admin/reviews" element={<AdminPendingReviews />} />
            <Route path="/admin/rejects" element={<AdminRejections />} />
            <Route path="/admin/approvals" element={<AdminApprovals />} />
          </Route>
        </Route>

        {/* 🔹 REVIEWER ROUTES (Placeholder) */}
        <Route element={<ProtectedRoute allowedRoles={["reviewer"]} />}>
          {/* Add Reviewer Specific Routes & Layout Here */}
        </Route>

        {/* 🔹 USER ROUTES */}
        <Route element={<ProtectedRoute allowedRoles={["user"]} />}>
          <Route element={<UserLayout />}>
            <Route path="/user/dashboard" element={<UserDashboard />} />
            <Route path="/user/assignments" element={<UserTasks />} />
            <Route path="/user/rejects" element={<UserRejections />} />
            <Route path="/user/history" element={<UserHistory />} />
            <Route path="/user/approvals" element={<UserApprovals />} />
          </Route>
        </Route>

        {/* Global Redirects */}
        <Route path="/" element={<Navigate to={homeRoute} replace />} />
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Router>
  );
};

export default App;