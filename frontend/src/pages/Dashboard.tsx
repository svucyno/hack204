import { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  Radar,
  RadarChart,
  PolarGrid,
  PolarAngleAxis,
  PolarRadiusAxis,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  Cell,
} from "recharts";
import { api } from "../api/client";

type Dash = {
  completion_percent: number;
  learning_streak_days: number;
  confidence_score: number;
  topic_mastery: { topic_id: string; mastery: number }[];
  weakness_radar: { topic_id: string; weakness_score: number }[];
  time_analytics: { total_minutes: number; by_topic: Record<string, number>; streak_days: number };
};

export default function Dashboard() {
  const nav = useNavigate();
  const [data, setData] = useState<Dash | null>(null);
  const [recs, setRecs] = useState<{ title: string; score: number; url?: string; rationale?: string }[]>([]);

  useEffect(() => {
    void (async () => {
      try {
        const [d, r] = await Promise.all([
          api.get<Dash>("/v1/analysis/dashboard"),
          api.post("/v1/recommend/items", { limit: 5 }),
        ]);
        setData(d.data);
        setRecs(r.data.items || []);
      } catch (err) {
        console.error("Dashboard failed to load", err);
      }
    })();
  }, []);

  if (!data) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-brand-400 animate-pulse text-lg font-medium">Loading analytics…</div>
      </div>
    );
  }

  const radarData = data.weakness_radar.slice(0, 6).map((w) => ({
    topic: w.topic_id,
    weakness: Math.round(w.weakness_score * 100),
  }));
  const barData = Object.entries(data.time_analytics.by_topic).map(([name, minutes]) => ({ name, minutes }));

  // Color palette for bars
  const colors = ["#8b5cf6", "#3b82f6", "#10b981", "#f59e0b", "#ec4899", "#6366f1"];

  return (
    <div className="space-y-10 py-6 max-w-6xl mx-auto">
      <div className="flex flex-wrap justify-between gap-6 items-end bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md">
        <div>
          <h1 className="text-4xl font-extrabold bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent pb-1">
            Dashboard
          </h1>
          <p className="text-slate-400 mt-1">Track your progress, overcome weaknesses, and act on AI suggestions.</p>
        </div>
        <div className="flex gap-3">
          <button 
            type="button"
            onClick={() => nav("/assessment?daily=true")}
            className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-amber-500 to-orange-500 hover:from-amber-400 hover:to-orange-400 text-white font-semibold transition-all shadow-lg shadow-orange-500/20 active:scale-95"
          >
            Start Daily Exam
          </button>
          <Link to="/roadmap" className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-500 font-semibold transition-all shadow-lg shadow-brand-500/20 text-white active:scale-95">
            View Roadmap
          </Link>
        </div>
      </div>

      <div className="grid sm:grid-cols-3 gap-6">
        <Stat label="Overall Completion" value={`${Math.round(data.completion_percent)}%`} color="text-emerald-400" icon="📈" />
        <Stat label="Current Streak" value={`${data.learning_streak_days} Days`} color="text-amber-400" icon="🔥" />
        <Stat label="Confidence Score" value={`${Math.round(data.confidence_score * 100)}%`} color="text-indigo-400" icon="🧠" />
      </div>

      <div className="grid lg:grid-cols-2 gap-8">
        <div className="h-80 rounded-3xl border border-slate-800 p-6 bg-slate-900/50 backdrop-blur-md shadow-xl flex flex-col relative overflow-hidden">
          <div className="absolute -top-10 -right-10 w-40 h-40 bg-brand-600/10 blur-3xl rounded-full"></div>
          <h2 className="text-lg font-bold text-slate-200 mb-4 z-10 flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-sky-400"></span> Weakness Radar
          </h2>
          <div className="flex-1 min-h-0 z-10">
            <ResponsiveContainer width="100%" height="100%">
              <RadarChart data={radarData} margin={{ top: 10, right: 30, bottom: 10, left: 30 }}>
                <PolarGrid stroke="#334155" strokeDasharray="3 3" />
                <PolarAngleAxis dataKey="topic" tick={{ fill: "#cbd5e1", fontSize: 12, fontWeight: 500 }} />
                <PolarRadiusAxis tick={{ fill: "#475569" }} axisLine={false} />
                <Tooltip wrapperStyle={{ outline: 'none' }} contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "1px solid #334155", color: "#f8fafc" }} />
                <Radar dataKey="weakness" name="Weakness %" stroke="#38bdf8" strokeWidth={2} fill="url(#colorRadar)" fillOpacity={0.5} />
                <defs>
                   <linearGradient id="colorRadar" x1="0" y1="0" x2="0" y2="1">
                     <stop offset="5%" stopColor="#0ea5e9" stopOpacity={0.8}/>
                     <stop offset="95%" stopColor="#818cf8" stopOpacity={0.2}/>
                   </linearGradient>
                </defs>
              </RadarChart>
            </ResponsiveContainer>
          </div>
        </div>

        <div className="h-80 rounded-3xl border border-slate-800 p-6 bg-slate-900/50 backdrop-blur-md shadow-xl flex flex-col relative overflow-hidden">
           <div className="absolute -bottom-10 -left-10 w-40 h-40 bg-indigo-600/10 blur-3xl rounded-full"></div>
          <h2 className="text-lg font-bold text-slate-200 mb-4 z-10 flex items-center gap-2">
             <span className="w-2 h-2 rounded-full bg-indigo-400"></span> Time Invested (minutes)
          </h2>
          <div className="flex-1 min-h-0 z-10">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={barData} margin={{ top: 10, right: 10, bottom: 20, left: -20 }}>
                <XAxis dataKey="name" tick={{ fill: "#94a3b8", fontSize: 11 }} axisLine={false} tickLine={false} dy={10} />
                <YAxis tick={{ fill: "#64748b", fontSize: 11 }} axisLine={false} tickLine={false} />
                <Tooltip 
                  cursor={{ fill: '#1e293b' }} 
                  contentStyle={{ backgroundColor: "#0f172a", borderRadius: "12px", border: "1px solid #334155", color: "#f8fafc" }} 
                />
                <Bar dataKey="minutes" radius={[6, 6, 0, 0]} maxBarSize={50}>
                   {barData.map((_, index) => (
                     <Cell key={`cell-${index}`} fill={colors[index % colors.length]} />
                   ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      <section className="bg-slate-900/50 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md">
        <h2 className="text-xl font-bold mb-4 flex items-center gap-2">
           <span className="text-2xl">✨</span> Daily AI Suggestions
        </h2>
        {recs.length === 0 ? (
           <p className="text-slate-400 text-sm">Reviewing your performance... keep learning to get personalized suggestions.</p>
        ) : (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
            {recs.map((x, i) => (
              <a
                key={i}
                href={x.url || "#"}
                target="_blank"
                rel="noreferrer"
                className="block p-5 rounded-2xl border border-slate-700/50 bg-slate-800/40 hover:bg-slate-800 hover:border-brand-500 transition-all group"
              >
                <div className="flex justify-between items-start mb-2">
                  <p className="font-semibold text-slate-100 group-hover:text-brand-300 transition-colors line-clamp-2">{x.title}</p>
                  <span className="text-xs font-bold px-2 py-1 bg-brand-500/20 text-brand-300 rounded-md whitespace-nowrap">
                    Score: {x.score?.toFixed?.(2)}
                  </span>
                </div>
                {x.rationale && (
                   <p className="text-xs text-slate-400 mt-2 italic line-clamp-2">{x.rationale}</p>
                )}
              </a>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}

function Stat({ label, value, color, icon }: { label: string; value: string, color: string, icon: string }) {
  return (
    <div className="p-6 rounded-3xl bg-slate-900/60 border border-slate-800 shadow-xl backdrop-blur-md flex items-center gap-4 hover:-translate-y-1 transition-transform">
      <div className="text-4xl bg-slate-800 p-3 rounded-2xl">{icon}</div>
      <div>
        <p className="text-slate-400 text-sm font-medium">{label}</p>
        <p className={`text-3xl font-extrabold ${color}`}>{value}</p>
      </div>
    </div>
  );
}
