import { useRef, useState, useEffect } from "react";
import {
  Check,
  Copy,
  Info,
  RefreshCw,
  Send,
  Sparkles,
  Trash2,
  User as UserIcon,
} from "lucide-react";
import { toast } from "sonner";
import { authService, AuthUser } from "@/services/authService";
import { dataService, UserProfile } from "@/services/dataService";
import { aiService, ChatMessage } from "@/services/aiService";
import { cn } from "@/lib/utils";

const suggestedPrompts = [
  "Am I on track?",
  "What if I study 5 hrs less?",
  "What should I do this week?",
  "How can I raise my probability?",
];

export function Chat({ compact = false }: { compact?: boolean }) {
  const [user, setUser] = useState<AuthUser | null>(null);
  const [profile, setProfile] = useState<UserProfile | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [lastError, setLastError] = useState<string | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  const endRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const hasKey = aiService.hasConfiguredKey();

  // Load user & profile & chat history
  useEffect(() => {
    const cur = authService.getCurrentUser();
    setUser(cur);
    if (!cur) return;

    dataService.getProfile(cur.id).then((p) => {
      setProfile(p);
      const storageKey = `trajectify_chat_${cur.id}`;
      try {
        const saved = localStorage.getItem(storageKey);
        if (saved) {
          setMessages(JSON.parse(saved));
        } else {
          const goalName = p?.goals.find((g) => g.id === p.activeGoalId)?.title;
          const greeting = goalName
            ? `Hi ${cur.name.split(" ")[0]}! I've loaded your goal "${goalName}", your roadmap milestones, and your weekly pace. What would you like to explore or simulate today?`
            : `Hi ${cur.name.split(" ")[0]}! I'm your Trajectify personal decision guide. Complete your profile onboarding anytime to unlock personalized simulations.`;

          setMessages([
            {
              id: "msg_init",
              role: "assistant",
              text: greeting,
              timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
            },
          ]);
        }
      } catch (e) {
        console.error("Failed to read chat history:", e);
      }
    });
  }, []);

  // Save history to localStorage
  useEffect(() => {
    if (!user || messages.length === 0) return;
    try {
      localStorage.setItem(`trajectify_chat_${user.id}`, JSON.stringify(messages));
    } catch (e) {
      console.warn("Failed to persist chat:", e);
    }
  }, [messages, user]);

  // Auto-scroll to latest message
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  async function handleSend(textToSend?: string) {
    const query = (textToSend || input).trim();
    if (!query || loading) return;

    setLastError(null);
    const userMsg: ChatMessage = {
      id: "usr_" + Date.now(),
      role: "user",
      text: query,
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };

    const newHistory = [...messages, userMsg];
    setMessages(newHistory);
    setInput("");
    setLoading(true);

    try {
      const activeGoal = profile?.goals.find((g) => g.id === profile.activeGoalId);
      const reply = await aiService.askAssistant(query, newHistory, profile, activeGoal);

      const aiMsg: ChatMessage = {
        id: "ai_" + Date.now(),
        role: "assistant",
        text: reply,
        timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
      };

      setMessages((prev) => [...prev, aiMsg]);
    } catch (err: unknown) {
      console.error(err);
      const msg =
        err instanceof Error ? err.message : "Failed to generate AI response. Please try again.";
      setLastError(msg);
    } finally {
      setLoading(false);
      setTimeout(() => inputRef.current?.focus(), 50);
    }
  }

  function handleCopy(text: string, index: number) {
    navigator.clipboard.writeText(text);
    setCopiedIndex(index);
    toast.success("Copied to clipboard!");
    setTimeout(() => setCopiedIndex(null), 2000);
  }

  function handleClearChat() {
    if (!user) return;
    const initialMsg: ChatMessage = {
      id: "msg_init",
      role: "assistant",
      text: "Chat cleared. What would you like to explore about your trajectory?",
      timestamp: new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages([initialMsg]);
    localStorage.removeItem(`trajectify_chat_${user.id}`);
    toast.info("Chat history cleared.");
  }

  function handleRetry() {
    const lastUserMsg = [...messages].reverse().find((m) => m.role === "user");
    if (lastUserMsg) {
      handleSend(lastUserMsg.text);
    }
  }

  return (
    <div className="flex h-full min-h-0 flex-col bg-card">
      {/* Configuration Status Notice */}
      {!hasKey && (
        <div className="flex items-center justify-between border-b bg-muted/60 px-4 py-2 text-[11px] text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <Info className="h-3.5 w-3.5 text-primary shrink-0" />
            <span>Using local profile intelligence engine.</span>
          </span>
          <span className="font-mono text-[10px] opacity-75 hidden sm:inline">
            VITE_GEMINI_API_KEY in .env enables live LLM
          </span>
        </div>
      )}

      {/* Header controls (Clear Chat) */}
      <div className="flex items-center justify-between border-b px-4 py-2 text-xs text-muted-foreground">
        <span className="font-semibold text-foreground flex items-center gap-1.5">
          <Sparkles className="h-3.5 w-3.5 text-primary" />
          {profile?.goals.find((g) => g.id === profile.activeGoalId)?.title || "Personal Assistant"}
        </span>
        <button
          onClick={handleClearChat}
          title="Clear chat history"
          className="flex items-center gap-1 rounded-lg px-2 py-1 hover:bg-muted hover:text-foreground transition"
        >
          <Trash2 className="h-3.5 w-3.5" />
          <span className="hidden sm:inline">Clear</span>
        </button>
      </div>

      {/* Messages Scrollable Area */}
      <div className={cn("flex-1 space-y-4 overflow-y-auto", compact ? "p-3" : "p-5")}>
        {messages.map((m, i) => (
          <div key={m.id || i}>
            {m.role === "user" ? (
              <div className="flex justify-end gap-2.5">
                <div className="max-w-[85%] rounded-2xl rounded-br-sm bg-primary px-4 py-2.5 text-sm text-primary-foreground shadow-soft">
                  <p className="whitespace-pre-wrap">{m.text}</p>
                  {m.timestamp && (
                    <span className="mt-1 block text-right text-[10px] opacity-75">
                      {m.timestamp}
                    </span>
                  )}
                </div>
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-secondary text-foreground text-xs font-bold">
                  {user?.initials || <UserIcon className="h-4 w-4" />}
                </div>
              </div>
            ) : (
              <div className="flex gap-2.5">
                <div className="grid h-8 w-8 shrink-0 place-items-center rounded-full bg-gradient-primary text-primary-foreground">
                  <Sparkles className="h-4 w-4" />
                </div>
                <div className="group relative max-w-[88%] rounded-2xl rounded-bl-sm border bg-gradient-ai px-4 py-3 text-sm shadow-soft">
                  <div className="prose prose-sm dark:prose-invert max-w-none whitespace-pre-wrap text-foreground">
                    {m.text}
                  </div>

                  <div className="mt-2.5 flex items-center justify-between border-t border-border/40 pt-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 rounded-full bg-ai/15 px-2 py-0.5 font-semibold text-ai">
                      <Sparkles className="h-3 w-3" /> based on your profile
                    </span>

                    <button
                      onClick={() => handleCopy(m.text, i)}
                      aria-label="Copy response"
                      className="inline-flex items-center gap-1 text-muted-foreground hover:text-foreground opacity-80 group-hover:opacity-100 transition"
                    >
                      {copiedIndex === i ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-success" /> Copied
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" /> Copy
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        ))}

        {/* Loading Indicator */}
        {loading && (
          <div className="flex gap-2.5">
            <div className="grid h-8 w-8 place-items-center rounded-full bg-gradient-primary text-primary-foreground">
              <Sparkles className="h-4 w-4" />
            </div>
            <div className="flex items-center gap-1.5 rounded-2xl border bg-card px-4 py-3 shadow-soft">
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: "0ms" }}
              />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: "150ms" }}
              />
              <span
                className="h-2 w-2 animate-bounce rounded-full bg-primary"
                style={{ animationDelay: "300ms" }}
              />
              <span className="ml-2 text-xs text-muted-foreground font-medium">
                Synthesizing...
              </span>
            </div>
          </div>
        )}

        {/* Error State with Retry Button */}
        {lastError && (
          <div className="flex items-center justify-between gap-3 rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
            <p>{lastError}</p>
            <button
              onClick={handleRetry}
              className="inline-flex items-center gap-1 rounded-lg bg-destructive px-3 py-1 font-semibold text-destructive-foreground hover:opacity-90"
            >
              <RefreshCw className="h-3.5 w-3.5" /> Retry
            </button>
          </div>
        )}

        <div ref={endRef} />
      </div>

      {/* Suggested Prompts & Input Box */}
      <div className={cn("border-t bg-card", compact ? "p-3" : "p-4")}>
        <div className="mb-2.5 flex flex-wrap gap-1.5">
          {suggestedPrompts.map((p) => (
            <button
              key={p}
              disabled={loading}
              onClick={() => handleSend(p)}
              className="rounded-full border border-border bg-card px-2.5 py-1 text-xs font-medium text-foreground transition hover:border-primary hover:text-primary disabled:opacity-50"
            >
              {p}
            </button>
          ))}
        </div>

        <form
          onSubmit={(e) => {
            e.preventDefault();
            handleSend();
          }}
          className="flex gap-2"
        >
          <label htmlFor={compact ? "chat-compact" : "chat-full"} className="sr-only">
            Ask Trajectify Assistant
          </label>
          <input
            ref={inputRef}
            id={compact ? "chat-compact" : "chat-full"}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            disabled={loading}
            placeholder="Ask about your trajectory, pace, or what-if trade-offs…"
            className="flex-1 rounded-xl border border-input bg-background px-4 py-2.5 text-sm outline-none transition focus:border-primary focus:ring-1 focus:ring-primary disabled:opacity-50"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            aria-label="Send message"
            className="grid h-10 w-10 place-items-center rounded-xl bg-gradient-primary text-primary-foreground shadow-soft transition hover:opacity-95 disabled:opacity-50"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
}
