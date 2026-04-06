import { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Camera, MonitorPlay, AlertTriangle, CheckCircle } from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const MOCK_MCQS = [
  { q: "Which HTTP method is typically used to create a new resource?", o: ["GET", "POST", "PUT", "DELETE"], a: 1 },
  { q: "What is the primary purpose of a 'key' in React lists?", o: ["Styling", "To uniquely identify elements for optimal re-rendering", "Routing", "Data fetching"], a: 1 },
  { q: "In SQL, which clause is used to filter records before grouping?", o: ["HAVING", "GROUP BY", "WHERE", "ORDER BY"], a: 2 },
  { q: "Which of the following is NOT a JavaScript data type?", o: ["Undefined", "Number", "Boolean", "Float"], a: 3 },
  { q: "What does CSS stand for?", o: ["Colorful Style Sheets", "Computer Style Sheets", "Cascading Style Sheets", "Creative Style Sheets"], a: 2 },
  { q: "Which status code means 'Not Found'?", o: ["200", "404", "500", "403"], a: 1 },
  { q: "In Git, what command saves your changes to the local repository?", o: ["git push", "git commit", "git save", "git upload"], a: 1 },
  { q: "What is a 'Promise' in JavaScript?", o: ["An object representing the eventual completion/failure of an async operation", "A strict rule in loops", "A way to define CSS", "A standard database query"], a: 0 },
  { q: "Which React hook is used to perform side effects?", o: ["useMemo", "useContext", "useEffect", "useState"], a: 2 },
  { q: "What is the VDOM (Virtual DOM) in React?", o: ["A real browser DOM", "A lightweight, in-memory representation of the DOM", "A database system", "A CSS preprocessor"], a: 1 }
];

const MOCK_CODING = [
  { title: "Two Sum", desc: "Write a function that takes an array of numbers and a target, and returns the indices of the two numbers that add up to the target." },
  { title: "Reverse String", desc: "Write a function that takes a string and returns it reversed without using the built-in .reverse() method." }
];

export function InterviewPage() {
  const { me, logout } = useAuth();
  
  const [examStatus, setExamStatus] = useState<'idle' | 'started' | 'completed'>('idle');
  const [answers, setAnswers] = useState<number[]>(Array(10).fill(-1));
  const [codeAnswers, setCodeAnswers] = useState<string[]>(Array(2).fill(''));
  const [score, setScore] = useState(0);

  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    return () => {
      stopCamera();
      if (document.fullscreenElement) {
        document.exitFullscreen().catch(err => console.error(err));
      }
    };
  }, []);

  const stopCamera = () => {
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }
  };

  const startExam = async () => {
    try {
      // 1. Request Fullscreen
      if (!document.fullscreenElement) {
        await document.documentElement.requestFullscreen();
      }
      
      // 2. Request Camera
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      streamRef.current = stream;
      
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      setExamStatus('started');
    } catch (err) {
      alert("Failed to start exam. Please ensure you grant camera permissions and allow full screen.");
      console.error(err);
    }
  };

  const submitExam = async () => {
    // Basic auto-grading for MCQs
    let correct = 0;
    answers.forEach((ans, i) => {
      if (ans === MOCK_MCQS[i].a) correct++;
    });
    setScore(correct);
    setExamStatus('completed');

    stopCamera();
    try {
      if (document.fullscreenElement) {
        await document.exitFullscreen();
      }
    } catch(e) {}
  };

  if (examStatus === 'completed') {
    return (
      <div className="min-h-svh bg-[#09090b] text-zinc-100 flex flex-col items-center justify-center p-6">
        <div className="max-w-md w-full bg-zinc-900 border border-zinc-800 rounded-2xl p-8 text-center shadow-xl">
          <CheckCircle className="w-16 h-16 text-emerald-400 mx-auto mb-4" />
          <h2 className="text-3xl font-bold text-white mb-2">Exam Submitted!</h2>
          <p className="text-zinc-400 mb-6">Your answers have been recorded.</p>
          
          <div className="bg-zinc-950 border border-zinc-800 rounded-xl p-6 mb-6">
            <h3 className="text-sm font-medium text-zinc-500 uppercase tracking-widest mb-1">MCQ Score</h3>
            <p className="text-4xl font-black text-emerald-400">{score} / 10</p>
            <p className="text-xs text-zinc-500 mt-2">Coding challenges will be manually reviewed.</p>
          </div>
          
          <Link to="/dashboard" className="w-full block text-center rounded-xl bg-violet-600 px-4 py-3 font-semibold text-white hover:bg-violet-500 transition">
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-svh bg-[#09090b] text-zinc-100 flex flex-col font-sans relative">
      <header className="flex items-center justify-between px-6 py-4 border-b border-white/5 bg-[#09090b]">
        <div className="text-cyan-500 font-bold text-xl tracking-tight">Cynosure Learning</div>
        {!document.fullscreenElement && (
          <nav className="hidden md:flex items-center gap-6 text-sm text-zinc-400">
            <Link to="/dashboard" className="hover:text-white">Dashboard</Link>
            <Link to="/learn" className="hover:text-white">Roadmap</Link>
            <Link to="/interview" className="text-zinc-200 font-medium hover:text-white">Interview</Link>
            <Link to="/reports" className="hover:text-white">Reports</Link>
            <div className="text-zinc-500 ml-4">{me?.email || 'user@example.com'}</div>
            <button onClick={() => logout()} className="text-red-400 hover:text-red-300 ml-2 font-medium">
              Logout
            </button>
          </nav>
        )}
      </header>
      
      {examStatus === 'idle' ? (
        <main className="flex-1 max-w-4xl w-full mx-auto p-6 lg:p-12 flex flex-col items-center justify-center">
          <div className="text-center mb-10">
            <h1 className="text-4xl font-black text-white mb-4 tracking-tight">Technical Mock Interview</h1>
            <p className="text-lg text-zinc-400 max-w-2xl mx-auto">
              Simulate a real proctored technical interview. You will face 10 multiple choice questions and 2 algorithmic coding challenges.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full max-w-3xl mb-12">
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center">
               <div className="w-12 h-12 bg-rose-500/10 rounded-full flex items-center justify-center mb-4 border border-rose-500/20">
                 <Camera className="w-6 h-6 text-rose-400" />
               </div>
               <h3 className="font-bold text-lg text-rose-100 mb-2">Camera Required</h3>
               <p className="text-sm text-zinc-400">Your webcam will monitor your environment during the assessment. Ensure you are well lit.</p>
            </div>
            
            <div className="bg-zinc-900/50 border border-zinc-800 rounded-2xl p-6 flex flex-col items-center text-center">
               <div className="w-12 h-12 bg-cyan-500/10 rounded-full flex items-center justify-center mb-4 border border-cyan-500/20">
                 <MonitorPlay className="w-6 h-6 text-cyan-400" />
               </div>
               <h3 className="font-bold text-lg text-cyan-100 mb-2">Fullscreen Lock</h3>
               <p className="text-sm text-zinc-400">The exam enforces fullscreen mode to prevent external searches. Exiting early may flag your attempt.</p>
            </div>
          </div>
          
          <button 
            onClick={startExam}
            className="rounded-xl shadow-2xl shadow-indigo-500/20 bg-gradient-to-r from-indigo-500 to-violet-500 px-8 py-4 font-bold text-white text-lg hover:scale-[1.02] transition-all"
          >
            Acknowledge & Start Exam
          </button>
        </main>
      ) : (
        <main className="flex-1 flex flex-col lg:flex-row relative">
          {/* Main Exam Content */}
          <div className="flex-1 overflow-auto p-6 sm:p-10 hide-scrollbar pb-32">
            <div className="max-w-4xl mx-auto space-y-12">
              
              {/* MCQs */}
              <section>
                <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4">
                  <span className="bg-indigo-500/20 text-indigo-400 font-bold px-3 py-1 rounded text-sm tracking-wide">SECTION 1</span>
                  <h2 className="text-2xl font-bold text-white">Multiple Choice</h2>
                </div>
                
                <div className="space-y-8">
                  {MOCK_MCQS.map((q, qIndex) => (
                    <div key={qIndex} className="bg-zinc-900/40 border border-zinc-800 p-6 rounded-2xl">
                      <p className="text-sm text-zinc-400 mb-4 uppercase font-bold tracking-widest text-[10px]">Question {qIndex + 1} of 10</p>
                      <h3 className="text-lg text-zinc-100 font-medium mb-5">{q.q}</h3>
                      <div className="space-y-2">
                        {q.o.map((opt, oIndex) => (
                          <label key={oIndex} className={`flex items-center gap-3 p-3 rounded-lg cursor-pointer transition-colors border ${answers[qIndex] === oIndex ? 'bg-indigo-500/10 border-indigo-500/50' : 'bg-transparent border-zinc-800 hover:bg-zinc-800/50'}`}>
                            <div className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 ${answers[qIndex] === oIndex ? 'border-indigo-400' : 'border-zinc-600'}`}>
                              {answers[qIndex] === oIndex && <div className="w-2.5 h-2.5 rounded-full bg-indigo-400" />}
                            </div>
                            <input 
                              type="radio" 
                              name={`mcq-${qIndex}`} 
                              className="hidden"
                              checked={answers[qIndex] === oIndex}
                              onChange={() => {
                                const newAnswers = [...answers];
                                newAnswers[qIndex] = oIndex;
                                setAnswers(newAnswers);
                              }}
                            />
                            <span className="text-sm text-zinc-300">{opt}</span>
                          </label>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              </section>

              {/* Coding Questions */}
              <section>
                <div className="flex items-center gap-3 mb-6 border-b border-zinc-800 pb-4 mt-16">
                  <span className="bg-emerald-500/20 text-emerald-400 font-bold px-3 py-1 rounded text-sm tracking-wide">SECTION 2</span>
                  <h2 className="text-2xl font-bold text-white">Coding Challenges</h2>
                </div>
                
                <div className="space-y-10">
                  {MOCK_CODING.map((q, cIndex) => (
                    <div key={cIndex} className="bg-zinc-900/40 border border-zinc-800 rounded-2xl overflow-hidden flex flex-col">
                      <div className="p-6 border-b border-zinc-800">
                        <h3 className="text-lg font-bold text-emerald-100 mb-2">{cIndex + 1}. {q.title}</h3>
                        <p className="text-sm text-zinc-400 leading-relaxed">{q.desc}</p>
                      </div>
                      <div className="bg-[#1e1e1e] p-4 flex-1">
                        <textarea 
                          className="w-full h-64 bg-transparent text-emerald-400 font-mono text-sm focus:outline-none resize-none"
                          placeholder="// Write your code here..."
                          spellCheck={false}
                          value={codeAnswers[cIndex]}
                          onChange={(e) => {
                            const newCodes = [...codeAnswers];
                            newCodes[cIndex] = e.target.value;
                            setCodeAnswers(newCodes);
                          }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </section>
              
              <div className="pt-8 flex justify-end">
                 <button 
                   onClick={submitExam}
                   className="rounded-xl shadow-lg bg-emerald-600 px-8 py-3 font-bold text-white hover:bg-emerald-500 transition-colors flex items-center gap-2"
                 >
                   <CheckCircle className="w-5 h-5" />
                   Submit Assessment
                 </button>
              </div>
            </div>
          </div>
          
          {/* Proctored Video Overlay */}
          <div className="fixed bottom-6 right-6 w-60 aspect-video bg-zinc-950 rounded-xl overflow-hidden shadow-2xl border-2 border-rose-500/30 z-50">
             <video 
               ref={videoRef} 
               autoPlay 
               playsInline 
               muted 
               className="w-full h-full object-cover transform -scale-x-100"
             />
             <div className="absolute top-2 left-2 flex items-center gap-1.5 bg-black/60 backdrop-blur px-2 py-1 rounded text-[10px] font-bold text-rose-400 uppercase tracking-widest">
                <div className="w-2 h-2 rounded-full bg-rose-500 animate-pulse" />
                Live Proctor
             </div>
          </div>
          
          {/* Fullscreen Warning Overlay */}
          {!document.fullscreenElement && (
             <div className="fixed top-20 right-6 bg-amber-500/10 border border-amber-500/30 text-amber-200 px-4 py-3 rounded-lg shadow-xl flex items-start gap-3 max-w-sm z-40 backdrop-blur">
                <AlertTriangle className="w-5 h-5 shrink-0 text-amber-400" />
                <div className="text-sm">
                  <p className="font-bold mb-1">Fullscreen Exited</p>
                  <p className="text-amber-200/70">Warning: Leaving fullscreen during a proctored exam is recorded and may invalidate your attempt.</p>
                </div>
             </div>
          )}
        </main>
      )}
    </div>
  );
}
