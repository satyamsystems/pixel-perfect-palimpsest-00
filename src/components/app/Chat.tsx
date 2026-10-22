import { useRef, useState, useEffect } from "react";
import { Send, Sparkles, User } from "lucide-react";
import { askAssistant, suggestedPrompts } from "@/lib/mock-data";
import { cn } from "@/lib/utils";

type Msg = { role: "user" | "ai"; text: string };

export function Chat({ compact = false }: { compact?: boolean }) {
  const [msgs, setMsgs] = useState<Msg[]>([
    { role: "ai", text: "Hi Aarav! I know your goal, roadmap and progress. Ask me anything about your trajectory." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);
  useEffect(() => endRef.current?.scrollIntoView({ behavior: "smooth" }), [msgs, loading]);

  async function send(q: string) {
    if (!q.trim() || loading) return;
    setMsgs((m) => [...m, { role: "user", text: q }]);
    setInput("");
    setLoading(true);
    const a = await askAssistant(q);
    setMsgs((m) => [...m, { role: "ai", text: a }]);
    setLoading(false);
  }

  return (
    <div className="flex h-full min-h-0 flex-col">
      <div className={cn("flex-1 space-y-3 overflow-y-auto", compact ? "p-3" : "p-5")}>
        {msgs.map((m, i) =>
          m.role === "user" ? (
            <div key={i} className="flex justify-end gap-2">
              <div className="max-w-[80%] rounded-2xl rounded-br-md bg-gradient-primary px-4 py-2.5 text-sm text-primary-foreground">{m.text}</div>
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary"><User className="h-4 w-4" /></div>
            </div>
          ) : (
            <div key={i} className="flex gap-2">
              <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></div>
              <div className="max-w-[85%] rounded-2xl rounded-bl-md border bg-gradient-ai px-4 py-3 text-sm shadow-soft">
                <p>{m.text}</p>
                {i > 0 && <span className="mt-2 inline-block rounded-full bg-violet/15 px-2 py-0.5 text-[11px] font-semibold text-violet">based on your profile</span>}
              </div>
            </div>
          ),
        )}
        {loading && (
          <div className="flex gap-2">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-primary-foreground"><Sparkles className="h-4 w-4" /></div>
            <div className="flex items-center gap-1 rounded-2xl border bg-card px-4 py-3">
              {[0, 1, 2].map((d) => <span key={d} className="h-2 w-2 animate-bounce rounded-full bg-violet" style={{ animationDelay: `${d * 120}ms` }} />)}
            </div>
          </div>
        )}
        <div ref={endRef} />
      </div>
      <div className={cn("border-t", compact ? "p-3" : "p-4")}>
        <div className="mb-2 flex flex-wrap gap-2">
          {suggestedPrompts.map((p) => (
            <button key={p} onClick={() => send(p)} className="rounded-full border bg-card px-3 py-1 text-xs font-medium transition hover:border-electric hover:text-electric">
              {p}
            </button>
          ))}
        </div>
        <form onSubmit={(e) => { e.preventDefault(); send(input); }} className="flex gap-2">
          <label htmlFor={compact ? "chat-c" : "chat-f"} className="sr-only">Ask about your plan</label>
          <input
            id={compact ? "chat-c" : "chat-f"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about your plan…"
            className="flex-1 rounded-xl border bg-background px-4 py-2.5 text-sm outline-none focus:border-electric"
          />
          <button type="submit" aria-label="Send" className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground">
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
