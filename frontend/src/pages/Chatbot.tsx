import { useEffect, useState } from "react";
import { api } from "../api/client";

type Msg = { role: string; content: string; created_at?: string };

export default function Chatbot() {
  const [items, setItems] = useState<Msg[]>([]);
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    void api.get<{ items: Msg[] }>("/v1/chatbot/history").then((r) => setItems(r.data.items || []));
  }, []);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) return;
    setLoading(true);
    const userMsg = text;
    setText("");
    setItems((prev) => [...prev, { role: "user", content: userMsg }]);
    const { data } = await api.post<{ reply: string }>("/v1/chatbot/message", { message: userMsg });
    setItems((prev) => [...prev, { role: "assistant", content: data.reply }]);
    setLoading(false);
  };

  return (
    <div className="max-w-2xl mx-auto flex flex-col h-[calc(100vh-220px)]">
      <h1 className="text-2xl font-bold mb-4">AI mentor</h1>
      <div className="flex-1 overflow-y-auto space-y-3 border border-slate-800 rounded-xl p-4 bg-slate-900/40">
        {items.map((m, i) => (
          <div
            key={`${i}-${m.role}`}
            className={`text-sm p-3 rounded-lg max-w-[90%] ${
              m.role === "user" ? "bg-brand-900/40 ml-auto" : "bg-slate-800 mr-auto"
            }`}
          >
            {m.content}
          </div>
        ))}
        {loading && <p className="text-slate-500 text-sm">Thinking…</p>}
      </div>
      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          className="flex-1 rounded-lg bg-slate-900 border border-slate-700 px-3 py-2"
          placeholder="Ask a concept, next step, or request a mini-quiz…"
          value={text}
          onChange={(e) => setText(e.target.value)}
        />
        <button type="submit" className="px-4 py-2 rounded-lg bg-brand-600" disabled={loading}>
          Send
        </button>
      </form>
    </div>
  );
}
