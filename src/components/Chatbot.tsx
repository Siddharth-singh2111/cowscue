"use client";

import { useEffect, useRef, useState } from "react";
import { usePathname } from "next/navigation";
import { SignInButton, useAuth } from "@clerk/nextjs";
import { AnimatePresence, motion } from "motion/react";
import { ArrowUp, MessageCircle, Sparkles, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { api, errorMessage } from "@/lib/api";
import { cn } from "@/lib/utils";

interface Message {
  role: "user" | "model";
  content: string;
}

const SUGGESTIONS = ["How do I report an injured cow?", "What happens after I report?", "How can my NGO join?"];
const HIDDEN_ON = ["/driver", "/dashboard"];

export default function Chatbot() {
  const pathname = usePathname();
  const { isSignedIn } = useAuth();
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "model", content: "Namaste! I'm Nandi, the Cowscue assistant. Ask me anything about reporting or rescues." },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, open, loading]);

  if (HIDDEN_ON.some((p) => pathname.startsWith(p))) return null;

  const send = async (text: string) => {
    const message = text.trim();
    if (!message || loading) return;
    setInput("");
    const history = messages.slice(1);
    setMessages((m) => [...m, { role: "user", content: message }]);
    setLoading(true);
    try {
      const { reply } = await api<{ reply: string }>("/api/chat", { method: "POST", json: { message, history } });
      setMessages((m) => [...m, { role: "model", content: reply }]);
    } catch (err) {
      setMessages((m) => [...m, { role: "model", content: errorMessage(err, "I'm having trouble connecting right now.") }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed bottom-24 right-4 z-[950] md:bottom-6 md:right-6">
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 16, scale: 0.97 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 12, scale: 0.97 }}
            transition={{ type: "spring", stiffness: 380, damping: 30 }}
            className="mb-3 flex h-[min(520px,70dvh)] w-[min(380px,calc(100vw-2rem))] origin-bottom-right flex-col overflow-hidden rounded-3xl border bg-card shadow-[var(--shadow-lift)]"
            role="dialog"
            aria-label="Cowscue assistant"
          >
            <div className="flex items-center gap-3 border-b px-4 py-3">
              <div className="grid size-9 place-items-center rounded-xl bg-primary-soft text-primary">
                <Sparkles className="size-4" />
              </div>
              <div className="flex-1">
                <p className="text-sm font-semibold">Nandi</p>
                <p className="text-xs text-muted-foreground">AI assistant · usually instant</p>
              </div>
              <Button variant="ghost" size="icon-sm" onClick={() => setOpen(false)} aria-label="Close assistant">
                <X />
              </Button>
            </div>

            <div className="flex-1 space-y-3 overflow-y-auto bg-subtle p-4 scrollbar-thin">
              {messages.map((m, i) => (
                <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
                  <div
                    className={cn(
                      "max-w-[85%] whitespace-pre-wrap rounded-2xl px-3.5 py-2.5 text-sm leading-relaxed",
                      m.role === "user" ? "rounded-br-md bg-primary text-primary-foreground" : "rounded-bl-md border bg-card"
                    )}
                  >
                    {m.content}
                  </div>
                </div>
              ))}
              {loading && (
                <div className="flex gap-1 rounded-2xl rounded-bl-md border bg-card px-3.5 py-3 w-fit">
                  {[0, 0.15, 0.3].map((d) => (
                    <span key={d} className="size-1.5 animate-bounce rounded-full bg-muted-foreground" style={{ animationDelay: `${d}s` }} />
                  ))}
                </div>
              )}
              {messages.length === 1 && isSignedIn && (
                <div className="flex flex-wrap gap-2 pt-1">
                  {SUGGESTIONS.map((s) => (
                    <button key={s} onClick={() => send(s)} className="rounded-full border bg-card px-3 py-1.5 text-xs transition hover:bg-accent">
                      {s}
                    </button>
                  ))}
                </div>
              )}
              <div ref={endRef} />
            </div>

            <div className="border-t p-3">
              {isSignedIn ? (
                <form
                  className="flex items-center gap-2 rounded-2xl border bg-background p-1.5 pl-3.5 focus-within:border-ring"
                  onSubmit={(e) => {
                    e.preventDefault();
                    void send(input);
                  }}
                >
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    placeholder="Ask a question…"
                    className="flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
                    maxLength={1000}
                    aria-label="Message"
                  />
                  <Button type="submit" size="icon-sm" disabled={!input.trim() || loading} aria-label="Send">
                    <ArrowUp />
                  </Button>
                </form>
              ) : (
                <SignInButton mode="modal">
                  <Button variant="outline" className="w-full">
                    Sign in to chat with Nandi
                  </Button>
                </SignInButton>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {!open && (
        <motion.button
          initial={{ scale: 0.8, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
          onClick={() => setOpen(true)}
          aria-label="Open assistant"
          className="ml-auto grid size-12 place-items-center rounded-full bg-inverse text-inverse-foreground shadow-[var(--shadow-lift)]"
        >
          <MessageCircle className="size-5" />
        </motion.button>
      )}
    </div>
  );
}
