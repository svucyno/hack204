import { api } from "../api/client";

export default function Reports() {
  const downloadReport = async () => {
    const res = await api.get("/v1/reports/progress.pdf", { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "progress-report.pdf";
    a.click();
    URL.revokeObjectURL(url);
  };

  const downloadResume = async () => {
    const res = await api.get("/v1/resume/generate", { responseType: "blob" });
    const url = URL.createObjectURL(res.data);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ats_resume.txt";
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8 py-8">
      <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md">
         <h1 className="text-4xl font-extrabold bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent pb-1 mb-2">Reports & Exports</h1>
         <p className="text-slate-400">Export your progress tracking or generate an ATS-ready resume from your learning goals.</p>
      </div>
      
      <div className="grid md:grid-cols-2 gap-6">
         <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 shadow-lg hover:border-brand-500/50 transition relative overflow-hidden">
            <h2 className="text-2xl font-bold text-slate-200 mb-2">Weekly Progress PDF</h2>
            <p className="text-slate-400 mb-6 text-sm">Download a summary of your stats, current week trajectory, and assessment scores in a beautifully formatted PDF document.</p>
            <button type="button" className="w-full px-6 py-3 rounded-xl bg-brand-600 hover:bg-brand-500 font-semibold text-white shadow-lg active:scale-95 transition" onClick={downloadReport}>
               Download Weekly Report
            </button>
         </div>

         <div className="p-8 rounded-3xl bg-slate-900/40 border border-slate-800 shadow-lg hover:border-indigo-500/50 transition relative overflow-hidden">
            <h2 className="text-2xl font-bold text-slate-200 mb-2">Auto-Generated Resume</h2>
            <p className="text-slate-400 mb-6 text-sm">Create an ATS-friendly simple text resume listing your goals, completed learning pathways, and relevant tech skills automatically.</p>
            <button type="button" className="w-full px-6 py-3 rounded-xl bg-indigo-600 hover:bg-indigo-500 font-semibold text-white shadow-lg active:scale-95 transition" onClick={downloadResume}>
               Generate Resume (.txt)
            </button>
         </div>
      </div>
    </div>
  );
}
