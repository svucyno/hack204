import { useState, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

export default function Onboarding() {
  const nav = useNavigate();
  const [goals, setGoals] = useState("Machine learning fundamentals");
  const [interests, setInterests] = useState("python, ml, data");
  const [style, setStyle] = useState("visual");
  const [analyzing, setAnalyzing] = useState(false);
  const [fileSelected, setFileSelected] = useState<File | null>(null);
  const [fileUrl, setFileUrl] = useState<string | null>(null);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileSelected(file);
    if (fileUrl) URL.revokeObjectURL(fileUrl);
    setFileUrl(URL.createObjectURL(file));

    setAnalyzing(true);
    const formData = new FormData();
    formData.append("file", file);

    try {
      const { data } = await api.post("/v1/resume/analyze", formData, {
        headers: { "Content-Type": "multipart/form-data" },
      });
      if (data.goals?.length) setGoals(data.goals.join(", "));
      if (data.interests?.length) setInterests(data.interests.join(", "));
      // We could store skills locally or send to backend profile if we added it,
      // but for now interests works as a proxy for skills/topics.
      if (data.skills?.length && !data.interests?.length) {
         setInterests(data.skills.join(", "));
      }
    } catch (err) {
      console.error("Resume analysis failed", err);
      alert("Failed to analyze resume. Please enter details manually.");
    } finally {
      setAnalyzing(false);
    }
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    await api.put("/v1/profile", {
      goals: goals.split(",").map((s) => s.trim()).filter(Boolean),
      interests: interests.split(",").map((s) => s.trim()).filter(Boolean),
      preferred_learning_style: style,
      current_skill_level: "beginner",
      learning_speed: 1,
    });
    nav("/assessment");
  };

  return (
    <div className="max-w-xl mx-auto py-8">
      <h1 className="text-3xl font-bold mb-3 bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent">Welcome — let’s personalize</h1>
      <p className="text-slate-400 mb-8 max-w-md">Tell us your goals and interests, or simply upload your resume and let our AI analyze your profile automatically.</p>
      
      <div className="mb-8 p-6 rounded-2xl border border-dashed border-indigo-500/50 hover:bg-slate-800/30 transition-colors backdrop-blur bg-slate-900/30 flex flex-col items-center justify-center relative shadow-lg">
         <h3 className="text-lg font-medium text-slate-200 mb-2">Upload Resume</h3>
         <p className="text-sm text-slate-400 mb-6 text-center">We extract skills, goals and interests to formulate your custom diagnostics.</p>
         
         {fileSelected && (
            <div className="w-full mb-6 flex flex-col items-center">
               <div className="px-3 py-1.5 bg-brand-900/30 border border-brand-500/30 text-brand-300 rounded text-sm font-medium mb-3 shadow-inner">
                  {fileSelected.name}
               </div>
               
               {fileUrl && fileSelected.type === "application/pdf" && (
                  <div className="w-full h-[250px] rounded-xl border border-slate-700 shadow-md overflow-hidden bg-white/5">
                     <iframe src={`${fileUrl}#toolbar=0&navpanes=0`} className="w-full h-full" title="Resume Preview"></iframe>
                  </div>
               )}
            </div>
         )}
         
         <input 
            type="file" 
            className="hidden" 
            ref={fileInputRef} 
            onChange={handleFileUpload} 
            accept=".pdf,.txt,.doc,.docx"
            disabled={analyzing}
         />
         <button 
           type="button"
           onClick={() => fileInputRef.current?.click()}
           disabled={analyzing}
           className="px-6 py-2.5 rounded-xl bg-slate-800 border border-slate-700 hover:border-indigo-500/50 hover:bg-slate-800 transition-all font-medium flex items-center justify-center gap-2 w-full max-w-xs"
         >
           {analyzing ? (
             <span className="animate-pulse text-indigo-400">Analyzing...</span>
           ) : (
             "Select File"
           )}
         </button>
      </div>

      <form onSubmit={save} className="space-y-5 p-6 rounded-2xl border border-slate-800 bg-slate-900/40 backdrop-blur shadow-lg">
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Goals (comma-separated)</label>
          <textarea
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-3 min-h-[80px] focus:outline-none focus:border-brand-500 transition-colors placeholder:text-slate-600"
            value={goals}
            onChange={(e) => setGoals(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Interests / topics</label>
          <input
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors placeholder:text-slate-600"
            value={interests}
            onChange={(e) => setInterests(e.target.value)}
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">Preferred style</label>
          <select
            className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 focus:outline-none focus:border-brand-500 transition-colors appearance-none"
            value={style}
            onChange={(e) => setStyle(e.target.value)}
          >
            <option value="visual">Visual (Diagrams, Videos)</option>
            <option value="auditory">Auditory (Podcasts, Lectures)</option>
            <option value="reading">Reading/Writing (Docs, Articles)</option>
            <option value="kinesthetic">Kinesthetic (Interactive, Coding)</option>
          </select>
        </div>
        <button type="submit" className="w-full py-3 mt-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 font-medium text-white shadow-lg shadow-brand-500/20 transition-all hover:-translate-y-0.5 active:translate-y-0">
          Continue to assessment
        </button>
      </form>
    </div>
  );
}
