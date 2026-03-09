import { Navigate, Outlet, useLocation } from "react-router-dom";
import { useAppSelector } from "../store/hooks";

interface Props {
  allowedRoles?: string[];
}

const ProtectedRoute = ({ allowedRoles }: Props) => {
  const { user, isCheckingAuth } = useAppSelector((state) => state.auth);
  const location = useLocation();

  // If we are still verifying the session, the App.tsx loader handles it.
  // But if this is used inside a nested route, we add a safety check:
  if (isCheckingAuth) return null;

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.role)) {
    return <Navigate to="/unauthorized" replace />;
  }

  return <Outlet />;
};

export default ProtectedRoute;