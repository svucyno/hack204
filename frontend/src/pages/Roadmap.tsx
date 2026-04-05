import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { api } from "../api/client";

type Path = {
  path_id: string;
  goal_summary: string;
  total_estimated_hours: number;
  modules: { topic_id: string; title: string; estimated_hours: number; order_index: number }[];
};

export default function Roadmap() {
  const [paths, setPaths] = useState<Path[]>([]);
  const [goal, setGoal] = useState("Become proficient in ML engineering");
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    void api.get<Path[]>("/v1/learning/paths").then((r) => setPaths(r.data));
  }, []);

  const generate = async () => {
    if (!goal.trim()) return;
    setBusy(true);
    await api.post("/v1/learning/path", { goal_summary: goal, topics_available: [] });
    const r = await api.get<Path[]>("/v1/learning/paths");
    setPaths(r.data);
    setBusy(false);
  };

  const removePath = (id: string) => {
    setPaths(paths.filter((p) => p.path_id !== id));
  };

  const downloadPath = (p: Path) => {
    const text = `Roadmap: ${p.goal_summary}\n` +
      `Estimated total hours: ${p.total_estimated_hours}\n\n` +
      `Modules:\n` +
      [...p.modules]
        .sort((a, b) => a.order_index - b.order_index)
        .map((m, i) => `${i + 1}. ${m.title} (${m.estimated_hours}h)`)
        .join("\n");
      
    const blob = new Blob([text], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `roadmap_${p.path_id.substring(0, 8)}.txt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-10 max-w-5xl mx-auto items-center py-6">
      <div className="bg-slate-900/60 p-6 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md">
         <h1 className="text-4xl font-extrabold bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent pb-1 mb-2">Learning Roadmap</h1>
         <p className="text-slate-400 mb-6">Create dynamic learning paths tailored to your exact career goals.</p>
         
         <div className="flex flex-wrap gap-4 items-end">
            <div className="flex-1 min-w-[200px]">
               <label className="block text-sm font-medium text-slate-400 mb-1.5 ml-1">What do you want to learn?</label>
               <input
                 className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 text-white transition-all shadow-inner"
                 value={goal}
                 onChange={(e) => setGoal(e.target.value)}
                 placeholder="e.g. Master full stack web development"
                 onKeyDown={(e) => e.key === "Enter" && generate()}
               />
            </div>
            <button 
               type="button" 
               disabled={busy} 
               className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 font-semibold text-white shadow-lg shadow-brand-500/20 active:scale-95 transition-all disabled:opacity-50 disabled:active:scale-100" 
               onClick={generate}
            >
               {busy ? "Generating..." : "Generate Path"}
            </button>
         </div>
      </div>

      <div className="space-y-8">
        {paths.map((p) => (
          <div key={p.path_id} className="relative rounded-3xl border border-slate-800 p-8 bg-slate-900/50 backdrop-blur-sm shadow-xl group hover:border-slate-700 transition-colors">
            
            <div className="absolute top-6 right-6 flex gap-2">
               <button 
                 onClick={() => downloadPath(p)}
                 className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-sm font-medium border border-slate-700 transition"
                 title="Download as Text"
               >
                  Download Outline
               </button>
               <button 
                 onClick={() => removePath(p.path_id)}
                 className="px-3 py-1.5 rounded-lg bg-red-900/20 text-red-400 hover:bg-red-900/40 hover:text-red-300 text-sm font-medium transition"
                 title="Remove from view"
               >
                  Remove
               </button>
            </div>

            <p className="text-slate-500 font-mono text-xs mb-2 uppercase tracking-wider">Path ID: {p.path_id.split("-")[0]}</p>
            <h2 className="text-2xl font-bold bg-gradient-to-r from-white to-slate-300 bg-clip-text text-transparent mb-2 pr-40">{p.goal_summary}</h2>
            <p className="inline-block px-3 py-1 rounded-full bg-indigo-500/10 text-indigo-300 border border-indigo-500/20 text-sm font-medium mb-6">
               ~{p.total_estimated_hours}h total investment
            </p>
            
            <div className="grid sm:grid-cols-2 gap-4">
               {[...p.modules]
                 .sort((a, b) => a.order_index - b.order_index)
                 .map((m, idx) => (
                   <Link 
                     key={m.topic_id}
                     to={`/topic/${m.topic_id}`}
                     className="block p-4 rounded-2xl bg-slate-800/40 border border-slate-700/50 hover:bg-slate-800 hover:border-brand-500/50 transition group/item"
                   >
                     <div className="flex justify-between items-start">
                        <div className="flex gap-3">
                           <div className="bg-slate-900 w-8 h-8 rounded-full flex items-center justify-center font-bold text-brand-400 text-sm border border-slate-700 shrink-0">
                              {idx + 1}
                           </div>
                           <div>
                              <h3 className="font-semibold text-slate-200 group-hover/item:text-brand-300 transition">{m.title}</h3>
                              <p className="text-xs text-slate-500 mt-1">{m.estimated_hours} hours</p>
                           </div>
                        </div>
                        <span className="text-slate-600 group-hover/item:text-brand-400 transition">→</span>
                     </div>
                   </Link>
                 ))}
            </div>
          </div>
        ))}
        {paths.length === 0 && !busy && (
           <div className="text-center py-20 text-slate-500 border-2 border-dashed border-slate-800 rounded-3xl">
              No learning paths generated yet. Start by entering a goal above!
           </div>
        )}
      </div>
    </div>
  );
}
