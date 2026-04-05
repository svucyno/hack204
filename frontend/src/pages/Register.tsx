import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Register() {
  const { register } = useAuth();
  const nav = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [full_name, setFullName] = useState("");
  const [err, setErr] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");
    try {
      await register(email, password, full_name);
      nav("/onboarding");
    } catch {
      setErr("Could not register (email may be taken).");
    }
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Create account</h1>
      <form onSubmit={submit} className="space-y-4">
        <div>
          <label className="block text-sm text-slate-400 mb-1">Full name</label>
          <input
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
            value={full_name}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Email</label>
          <input
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
        </div>
        <div>
          <label className="block text-sm text-slate-400 mb-1">Password (min 8)</label>
          <input
            className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            minLength={8}
            required
          />
        </div>
        {err && <p className="text-red-400 text-sm">{err}</p>}
        <button type="submit" className="w-full py-2 rounded-lg bg-brand-600 hover:bg-brand-500 font-medium">
          Register
        </button>
      </form>
      <p className="mt-4 text-sm">
        <Link className="text-brand-400" to="/login">
          Already have an account?
        </Link>
      </p>
    </div>
  );
}
