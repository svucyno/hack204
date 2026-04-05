import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { api } from "../api/client";

type Q = {
  question_id: string;
  topic_id: string;
  type: string;
  prompt: string;
  options?: { id: string; text: string }[];
  starter_code?: string | null;
};

export default function SkillAssessment() {
  const nav = useNavigate();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [questions, setQuestions] = useState<Q[]>([]);
  const [idx, setIdx] = useState(0);
  const [result, setResult] = useState<Record<string, unknown> | null>(null);
  const [loading, setLoading] = useState(false);

  const start = async () => {
    setLoading(true);
    const { data } = await api.post("/v1/quiz/session", {
      topic_ids: ["py-basics", "ml-intro"],
      num_questions: 6,
      include_coding: true,
    });
    setSessionId(data.session_id);
    setQuestions(data.questions);
    setIdx(0);
    setResult(null);
    setLoading(false);
  };

  const pick = async (optionId: string) => {
    if (!sessionId || !questions[idx]) return;
    setLoading(true);
    await api.post("/v1/quiz/answer", {
      session_id: sessionId,
      question_id: questions[idx].question_id,
      selected_option_id: optionId,
    });
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
    } else {
      const { data: fin } = await api.post(`/v1/quiz/session/${sessionId}/finalize`);
      setResult(fin);
    }
    setLoading(false);
  };

  const submitCode = async (code: string) => {
    if (!sessionId || !questions[idx]) return;
    setLoading(true);
    await api.post("/v1/quiz/answer", {
      session_id: sessionId,
      question_id: questions[idx].question_id,
      code_submission: code,
    });
    if (idx + 1 < questions.length) {
      setIdx(idx + 1);
    } else {
      const { data: fin } = await api.post(`/v1/quiz/session/${sessionId}/finalize`);
      setResult(fin);
    }
    setLoading(false);
  };

  if (result) {
    return (
      <div className="max-w-lg mx-auto space-y-4">
        <h1 className="text-2xl font-bold">Assessment complete</h1>
        <p className="text-slate-300">Score: {String(result.score_percent)}%</p>
        <p className="text-slate-400 text-sm">Level: {String(result.classified_level)}</p>
        <button type="button" className="px-4 py-2 rounded-lg bg-brand-600" onClick={() => nav("/dashboard")}>
          Go to dashboard
        </button>
      </div>
    );
  }

  const q = questions[idx];

  return (
    <div className="max-w-xl mx-auto space-y-6">
      <h1 className="text-2xl font-bold">Skill assessment</h1>
      {!sessionId && (
        <button type="button" disabled={loading} className="px-4 py-2 rounded-lg bg-brand-600" onClick={start}>
          Start diagnostic
        </button>
      )}
      {q && (
        <div className="p-6 rounded-xl border border-slate-800 bg-slate-900/50">
          <p className="text-slate-400 text-sm mb-2">
            Question {idx + 1} / {questions.length}
          </p>
          <p className="text-lg mb-4">{q.prompt}</p>
          {q.type === "mcq" && q.options && (
            <div className="space-y-2">
              {q.options.map((o) => (
                <button
                  key={o.id}
                  type="button"
                  disabled={loading}
                  onClick={() => pick(o.id)}
                  className="block w-full text-left px-4 py-2 rounded-lg border border-slate-700 hover:border-brand-500"
                >
                  {o.text}
                </button>
              ))}
            </div>
          )}
          {q.type === "coding" && (
            <CodingBox
              key={q.question_id}
              onSubmit={submitCode}
              disabled={loading}
              initialCode={q.starter_code || "def solve():\n    return 42\n"}
            />
          )}
        </div>
      )}
    </div>
  );
}

function CodingBox({
  onSubmit,
  disabled,
  initialCode,
}: {
  onSubmit: (c: string) => void;
  disabled: boolean;
  initialCode: string;
}) {
  const [code, setCode] = useState(initialCode);
  return (
    <div>
      <textarea
        className="w-full font-mono text-sm rounded-lg bg-slate-950 border border-slate-700 p-3 min-h-[120px]"
        value={code}
        onChange={(e) => setCode(e.target.value)}
      />
      <button
        type="button"
        disabled={disabled}
        className="mt-2 px-4 py-2 rounded-lg bg-brand-600"
        onClick={() => onSubmit(code)}
      >
        Submit code
      </button>
    </div>
  );
}
