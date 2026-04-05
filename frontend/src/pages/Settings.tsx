import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { api } from "../api/client";

export default function Settings() {
  const { user } = useAuth();
  const [profile, setProfile] = useState<any>(null);
  const [linkedin, setLinkedin] = useState("");
  const [github, setGithub] = useState("");
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    const fetchProfile = async () => {
      try {
        const { data } = await api.get("/v1/profile");
        setProfile(data);
        if (data.linkedin_url) setLinkedin(data.linkedin_url);
        if (data.github_url) setGithub(data.github_url);
      } catch (err) {
        // profile might not exist
      } finally {
        setLoading(false);
      }
    };
    fetchProfile();
  }, []);

  const saveProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    setSaving(true);
    setMessage("");
    try {
      const payload = profile || {};
      await api.put("/v1/profile", {
        ...payload,
        linkedin_url: linkedin,
        github_url: github
      });
      setMessage("Profile updated successfully");
    } catch (err) {
       console.error(err);
      setMessage("Error updating profile");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-lg space-y-6">
      <h1 className="text-3xl font-bold bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent pb-1">Settings</h1>
      
      <div className="p-5 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur shadow-lg">
        <p className="text-slate-400 text-sm uppercase tracking-wider mb-1">Account Info</p>
        <p className="font-semibold text-xl text-white">{user?.email}</p>
        <div className="flex items-center gap-2 mt-2">
          <span className="text-slate-500 text-sm">Role:</span>
          <span className="px-2.5 py-0.5 rounded-full text-xs font-medium bg-brand-500/10 text-brand-400 border border-brand-500/20 uppercase tracking-wide">
            {user?.role}
          </span>
        </div>
      </div>

      <form onSubmit={saveProfile} className="space-y-5 p-5 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur shadow-lg">
        <h2 className="text-lg font-semibold border-b border-slate-800/80 pb-3 text-slate-200">Social Profiles</h2>
        {loading ? (
          <div className="h-20 flex items-center justify-center">
            <span className="text-brand-400 animate-pulse text-sm font-medium">Loading profile data...</span>
          </div>
        ) : (
          <div className="space-y-4 pt-2">
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">LinkedIn URL</label>
              <input
                type="url"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                value={linkedin}
                onChange={(e) => setLinkedin(e.target.value)}
                placeholder="https://linkedin.com/in/username"
              />
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-300 mb-1.5 ml-1">GitHub URL</label>
              <input
                type="url"
                className="w-full rounded-xl bg-slate-950 border border-slate-700 px-4 py-2.5 text-white placeholder-slate-600 focus:outline-none focus:ring-2 focus:ring-brand-500/50 focus:border-brand-500 transition-all"
                value={github}
                onChange={(e) => setGithub(e.target.value)}
                placeholder="https://github.com/username"
              />
            </div>
            
            <div className="pt-2 flex items-center justify-between">
              <span className="text-sm font-medium text-brand-400">{message}</span>
              <button
                type="submit"
                disabled={saving}
                className="py-2.5 px-6 rounded-xl bg-brand-600 hover:bg-brand-500 text-white font-medium transition-all shadow-lg shadow-brand-500/20 disabled:opacity-50 hover:-translate-y-0.5 active:translate-y-0"
              >
                {saving ? "Saving..." : "Save Profiles"}
              </button>
            </div>
          </div>
        )}
      </form>

      <div className="flex flex-col gap-4 p-5 pt-4 rounded-2xl border border-slate-800 bg-slate-900/50 backdrop-blur shadow-lg">
         <h2 className="text-lg font-semibold border-b border-slate-800/80 pb-3 text-slate-200">Quick Actions</h2>
        <Link className="flex items-center text-brand-400 hover:text-brand-300 transition-colors font-medium group" to="/forgot-password">
          <span className="mr-2 opacity-50 group-hover:opacity-100 transition-opacity">→</span> Reset account password
        </Link>
        <Link className="flex items-center text-brand-400 hover:text-brand-300 transition-colors font-medium group" to="/onboarding">
           <span className="mr-2 opacity-50 group-hover:opacity-100 transition-opacity">→</span> Review or edit onboarding goals
        </Link>
      </div>
    </div>
  );
}
