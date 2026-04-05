import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Protected({ children, admin }: { children: React.ReactNode; admin?: boolean }) {
  const { user, loading } = useAuth();
  if (loading) {
    return <div className="text-center py-20 text-slate-400">Loading…</div>;
  }
  if (!user) {
    return <Navigate to="/" replace />;
  }
  if (admin && user.role !== "admin") {
    return <Navigate to="/dashboard" replace />;
  }
  return <>{children}</>;
}
