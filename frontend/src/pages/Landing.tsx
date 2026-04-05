import { Link } from "react-router-dom";
import { motion } from "framer-motion";

export default function Landing() {
  return (
    <div className="space-y-20 py-10 relative overflow-hidden">
      {/* Background decoration elements */}
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-full max-w-5xl pointer-events-none -z-10 blur-[120px] opacity-30">
        <div className="w-[600px] h-[600px] bg-gradient-to-tr from-brand-600 to-indigo-500 rounded-full animate-pulse blur-3xl absolute top-10 right-10 mix-blend-screen" />
        <div className="w-[400px] h-[400px] bg-gradient-to-tr from-violet-600 to-fuchsia-500 rounded-full animate-pulse blur-3xl absolute top-40 left-10 mix-blend-screen" />
      </div>

      <motion.section
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="text-center max-w-4xl mx-auto px-4"
      >
        <h1 className="text-5xl sm:text-7xl font-extrabold tracking-tight pb-2 leading-tight">
          Master Any Topic.<br />
          <span className="bg-gradient-to-r from-brand-400 via-indigo-400 to-violet-400 bg-clip-text text-transparent pb-4 inline-block">
            Your Personal AI Mentor.
          </span>
        </h1>
        <p className="mt-8 text-xl text-slate-300 max-w-3xl mx-auto leading-relaxed">
          Unlock your potential with intelligent, adaptive learning roadmaps perfectly tailored to your goals. Let AI guide you step-by-step from beginner to mastery.
        </p>
        <div className="mt-12 flex flex-col sm:flex-row justify-center gap-6">
          <Link
            to="/register"
            className="px-8 py-4 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-bold text-lg shadow-[0_0_40px_-5px_rgba(79,70,229,0.5)] transition hover:scale-105 active:scale-95"
          >
            Start Learning Free
          </Link>
          <Link
            to="/login"
            className="px-8 py-4 rounded-xl border-2 border-slate-700 hover:border-slate-500 hover:bg-slate-800/50 text-white font-bold text-lg backdrop-blur transition hover:scale-105 active:scale-95"
          >
            Sign In
          </Link>
        </div>
      </motion.section>

      <section className="grid sm:grid-cols-3 gap-8 px-4 max-w-6xl mx-auto relative z-10">
        {[
          { icon: "🎯", t: "Smart Diagnostics", d: "Hyper-accurate initial assessments to gauge your exact skill level across multiple domains." },
          { icon: "🗺️", t: "Dynamic Roadmaps", d: "Real-time generating learning paths that adapt as you conquer each micro-milestone." },
          { icon: "🤖", t: "AI Mentorship", d: "A 24/7 intelligent coach providing precise answers, curated links, and personalized feedback." },
        ].map((c, i) => (
          <motion.div
            key={c.t}
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ delay: i * 0.15, duration: 0.6 }}
            className="p-8 rounded-3xl bg-slate-900/60 backdrop-blur-md border border-slate-800 shadow-xl hover:bg-slate-800/80 hover:-translate-y-2 transition duration-300 group"
          >
            <div className="text-4xl mb-4 group-hover:scale-110 transition origin-left">{c.icon}</div>
            <h3 className="text-xl font-bold text-white mb-3">{c.t}</h3>
            <p className="text-slate-400 leading-relaxed">{c.d}</p>
          </motion.div>
        ))}
      </section>
    </div>
  );
}
