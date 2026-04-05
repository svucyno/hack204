import { useState, useEffect } from "react";
import { Link, useParams } from "react-router-dom";
import { api } from "../api/client";

const blurbs: Record<string, string> = {
  "py-basics": "Variables, control flow, functions, and modules — foundation for all later topics.",
  "ds-arrays": "Arrays, complexity, and patterns used across interviews and ML prep.",
  "ml-intro": "Supervised learning, train/test split, and core sklearn-style workflows.",
  "nlp-101": "Tokenization, embeddings, and simple text classifiers.",
  "dl-cnn": "Convolutional nets for vision; ties into transfer learning.",
};

export default function TopicDetail() {
  const { topicId } = useParams();
  const t = topicId || "topic";
  const defaultText = blurbs[t] || "Explore this topic through your roadmap modules, quizzes, and mentor chat.";
  
  const [loadingLinks, setLoadingLinks] = useState(false);
  const [curatedLinks, setCuratedLinks] = useState<string>("");

  useEffect(() => {
    // Attempt to dynamically fetch related videos and w3schools/accurate links from our AI mentor via a direct prompt
    const fetchLinks = async () => {
      setLoadingLinks(true);
      try {
         const { data } = await api.post("/v1/chatbot/message", {
            message: `Provide exactly 2 highly accurate tutorial links (prefer W3Schools or official docs if applicable) and 2 recommended YouTube video search queries to learn about: ${t.replace(/-/g, " ")}. Format them cleanly with markdown bullet points, without introductory fluff.`,
            topic_hint: t
         });
         setCuratedLinks(data.reply);
      } catch (err) {
         setCuratedLinks("");
      } finally {
         setLoadingLinks(false);
      }
    };
    fetchLinks();
  }, [t]);

  return (
    <div className="max-w-3xl mx-auto space-y-8 py-8">
      <Link to="/roadmap" className="inline-flex items-center text-sm font-medium text-brand-400 hover:text-brand-300 transition">
        ← Back to roadmap
      </Link>
      
      <div className="bg-slate-900/60 p-8 rounded-3xl border border-slate-800 shadow-xl backdrop-blur-md">
         <h1 className="text-4xl font-extrabold capitalize bg-gradient-to-r from-brand-400 to-indigo-400 bg-clip-text text-transparent pb-2">{t.replace(/-/g, " ")}</h1>
         <p className="text-lg text-slate-300 mt-2">{defaultText}</p>
         
         <div className="flex gap-4 mt-8">
           <Link to="/chat" className="px-6 py-3 rounded-xl bg-gradient-to-r from-brand-600 to-indigo-600 hover:from-brand-500 hover:to-indigo-500 text-white font-semibold transition shadow-lg shadow-brand-500/20 active:scale-95">
             Ask AI Mentor
           </Link>
           <Link to="/assessment" className="px-6 py-3 rounded-xl border-2 border-slate-700 hover:border-slate-500 hover:bg-slate-800 font-semibold text-slate-200 transition active:scale-95">
             Practice Quiz
           </Link>
         </div>
      </div>

      <div className="bg-slate-900/40 p-8 rounded-3xl border border-slate-800 shadow-lg relative overflow-hidden">
         <h2 className="text-xl font-bold mb-6 flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-indigo-500/20 flex items-center justify-center text-indigo-400">📚</div>
            Curated Resources
         </h2>
         
         {loadingLinks ? (
            <div className="flex gap-3 text-slate-400 items-center py-4">
               <div className="w-4 h-4 rounded-full border-2 border-brand-500 border-t-transparent animate-spin"></div>
               Finding the best tutorials and videos...
            </div>
         ) : curatedLinks ? (
            <div className="prose prose-invert prose-indigo max-w-none text-slate-300">
               {/* We render markdown broadly by doing a simple line split or using a minimal approach */}
               <ul className="space-y-2 list-none p-0">
                  {curatedLinks.split('\n').filter(line => line.trim()).map((line, i) => (
                     <li key={i} className="flex gap-3 start-items">
                        <span className="text-brand-400 mt-1">•</span>
                        <span dangerouslySetInnerHTML={{ __html: line.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>').replace(/\[([^\]]+)\]\(([^)]+)\)/g, '<a href="$2" target="_blank" class="text-brand-400 hover:underline">$1</a>') }} />
                     </li>
                  ))}
               </ul>
            </div>
         ) : (
            <p className="text-slate-500 italic">No exact resources found automatically. Try asking the Mentor!</p>
         )}
      </div>
    </div>
  );
}
