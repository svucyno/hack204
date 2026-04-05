import { useEffect, useState } from "react";
import { api } from "../api/client";

type Stats = {
  total_users: number;
  active_learners_7d: number;
  assessments_completed_7d: number;
  paths_created_7d: number;
};

export default function AdminDashboard() {
  const [stats, setStats] = useState<Stats | null>(null);
  const [users, setUsers] = useState<{ email: string; role: string; id: string }[]>([]);

  useEffect(() => {
    void (async () => {
      const [s, u] = await Promise.all([api.get<Stats>("/v1/admin/stats"), api.get("/v1/admin/users")]);
      setStats(s.data);
      setUsers(u.data.items || []);
    })();
  }, []);

  return (
    <div className="space-y-8">
      <h1 className="text-3xl font-bold text-amber-400">Admin</h1>
      {stats && (
        <div className="grid sm:grid-cols-4 gap-4">
          {Object.entries(stats).map(([k, v]) => (
            <div key={k} className="p-4 rounded-xl border border-slate-800">
              <p className="text-slate-500 text-xs">{k}</p>
              <p className="text-2xl font-bold">{v}</p>
            </div>
          ))}
        </div>
      )}
      <section>
        <h2 className="text-lg font-semibold mb-2">Users</h2>
        <div className="rounded-xl border border-slate-800 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-slate-900 text-slate-400 text-left">
              <tr>
                <th className="p-2">Email</th>
                <th className="p-2">Role</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-t border-slate-800">
                  <td className="p-2">{u.email}</td>
                  <td className="p-2">{u.role}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
