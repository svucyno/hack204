import { Link, Outlet, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { useAuth } from "../context/AuthContext";

export default function Layout() {
  const { user, logout } = useAuth();
  const nav = useNavigate();

  const handleLogout = () => {
    logout();
    nav("/");
  };
  return (
    <div className="min-h-screen flex flex-col">
      <motion.header
        initial={{ y: -12, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        className="border-b border-slate-800 bg-slate-900/80 backdrop-blur sticky top-0 z-40"
      >
        <div className="max-w-6xl mx-auto px-4 py-3 flex items-center justify-between gap-4 flex-wrap">
          <Link to="/" className="text-xl font-semibold text-brand-500">
            Cynosure Learning
          </Link>
          <nav className="flex flex-wrap gap-3 text-sm items-center">
            {user ? (
              <>
                <Link className="hover:text-brand-400" to="/dashboard">
                  Dashboard
                </Link>
                <Link className="hover:text-brand-400" to="/roadmap">
                  Roadmap
                </Link>
                <Link className="hover:text-brand-400" to="/chat">
                  Mentor
                </Link>
                <Link className="hover:text-brand-400" to="/reports">
                  Reports
                </Link>
                <Link className="hover:text-brand-400" to="/settings">
                  Settings
                </Link>
                {user.role === "admin" && (
                  <Link className="text-amber-400 hover:text-amber-300" to="/admin">
                    Admin
                  </Link>
                )}
                <span className="text-slate-500 hidden sm:inline">{user.email}</span>
                <button type="button" onClick={handleLogout} className="text-red-400 hover:text-red-300">
                  Logout
                </button>
              </>
            ) : (
              <>
                <Link className="hover:text-brand-400" to="/login">
                  Login
                </Link>
                <Link className="hover:text-brand-400" to="/register">
                  Register
                </Link>
              </>
            )}
          </nav>
        </div>
      </motion.header>
      <main className="flex-1 max-w-6xl mx-auto w-full px-4 py-8">
        <Outlet />
      </main>
    </div>
  );
}
