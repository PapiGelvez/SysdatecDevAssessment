import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = () => {
    logout();
    navigate("/login", { replace: true });
  };

  return (
    <nav className="bg-slate-800 text-white shadow">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
        <Link to="/dashboard" className="text-lg font-semibold">
          🎫 AI Ticket Workspace
        </Link>
        <div className="flex items-center gap-4">
          <span className="text-sm text-slate-300">
            {user?.name}{" "}
            <span className="text-slate-400">(@{user?.username})</span>
          </span>
          <button
            onClick={handleLogout}
            className="rounded bg-slate-600 px-3 py-1 text-sm hover:bg-slate-500"
          >
            Logout
          </button>
        </div>
      </div>
    </nav>
  );
}
