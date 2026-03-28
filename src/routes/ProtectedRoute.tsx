import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

type AllowedRole = "user" | "admin" | "superadmin" | "examiner";

interface Props {
  allowedRoles?: AllowedRole[];
}

const ProtectedRoute = ({ allowedRoles }: Props) => {
  const { user, isCheckingAuth } = useAppSelector((state) => state.auth);
  const location = useLocation();

  if (isCheckingAuth) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role as AllowedRole)) {
    // Redirect to their own home instead of /unauthorized
    const homeRoutes: Record<string, string> = {
      superadmin: "/superadmin/dashboard",
      admin: "/admin/dashboard",
      examiner: "/admin/dashboard",
      user: "/user/dashboard",
    };
    return <Navigate to={homeRoutes[user.role] || "/login"} replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;