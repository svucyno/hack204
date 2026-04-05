import { useState } from "react";
import { api } from "../api/client";

export default function ForgotPassword() {
  const [email, setEmail] = useState("");
  const [msg, setMsg] = useState("");

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg("");
    await api.post("/v1/auth/forgot-password", { email });
    setMsg("If the account exists, check your email (or server logs if SMTP is not configured).");
  };

  return (
    <div className="max-w-md mx-auto">
      <h1 className="text-2xl font-bold mb-6">Reset password</h1>
      <form onSubmit={submit} className="space-y-4">
        <input
          className="w-full rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
          type="email"
          placeholder="Email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          required
        />
        <button type="submit" className="w-full py-2 rounded-lg bg-brand-600">
          Send reset link
        </button>
      </form>
      {msg && <p className="mt-4 text-slate-400 text-sm">{msg}</p>}
    </div>
  );
}
