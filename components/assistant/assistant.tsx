"use client";

import { useEffect, useRef, useState, type FormEvent } from "react";
import { Lightbulb, MessageCircle, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { matchFaq, type Tip } from "@/lib/assistant";
import type { AssistantData } from "@/lib/types";
import { cn } from "@/lib/utils";

const TYPING_DELAY_MS = 800;
const GREETING_DELAY_MS = 4000;
const GREETED_KEY = "laige-anna-greeted";
const OPENED_KEY = "laige-anna-opened";

type Message = { id: number; from: "bot" | "user"; text: string };

function hasFlag(key: string): boolean {
  try {
    return window.sessionStorage.getItem(key) === "1";
  } catch {
    return false;
  }
}

function setFlag(key: string) {
  try {
    window.sessionStorage.setItem(key, "1");
  } catch {
    // Without storage the greeting may return on the next page load, nothing worse.
  }
}

export function Assistant({
  faq,
  welcomeMessage,
  fallbackMessage,
  tips,
  raised,
  hidden,
}: AssistantData & { tips: Tip[]; raised: boolean; hidden: boolean }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([{ id: 0, from: "bot", text: welcomeMessage }]);
  const [input, setInput] = useState("");
  const [typing, setTyping] = useState(false);
  const [wantsAttention, setWantsAttention] = useState(false);
  const [showBubble, setShowBubble] = useState(false);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const openedRef = useRef(false);
  const nextId = useRef(1);
  const endRef = useRef<HTMLDivElement>(null);

  const chips = faq.filter((item) => item.showAsChip);

  useEffect(() => {
    const greeting = setTimeout(() => {
      if (openedRef.current || hasFlag(OPENED_KEY)) return;
      setWantsAttention(true);
      if (!hasFlag(GREETED_KEY)) {
        setFlag(GREETED_KEY);
        setShowBubble(true);
      }
    }, GREETING_DELAY_MS);
    return () => clearTimeout(greeting);
  }, []);

  // Over a phone's form the greeting steps aside as soon as the customer starts using it.
  useEffect(() => {
    if (!showBubble || !raised || !window.matchMedia("(max-width: 1023px)").matches) return;
    const hide = () => setShowBubble(false);
    window.addEventListener("scroll", hide, { passive: true, once: true });
    window.addEventListener("pointerdown", hide, { once: true });
    return () => {
      window.removeEventListener("scroll", hide);
      window.removeEventListener("pointerdown", hide);
    };
  }, [showBubble, raised]);

  useEffect(() => {
    if (open) endRef.current?.scrollIntoView({ block: "end" });
  }, [messages, typing, open]);

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function openChat() {
    openedRef.current = true;
    setFlag(OPENED_KEY);
    setOpen(true);
    setShowBubble(false);
    setWantsAttention(false);
  }

  function say(from: Message["from"], text: string) {
    setMessages((current) => [...current, { id: nextId.current++, from, text }]);
  }

  function reply(question: string, answer: string) {
    if (typing) return;
    say("user", question);
    setTyping(true);
    timer.current = setTimeout(() => {
      setTyping(false);
      say("bot", answer);
    }, TYPING_DELAY_MS);
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    const question = input.trim();
    if (!question || typing) return;
    setInput("");
    reply(question, matchFaq(question, faq)?.answer ?? fallbackMessage);
  }

  const badge = wantsAttention ? Math.max(1, tips.length) : tips.length;

  return (
    <>
      {!open && !hidden && (
        <div
          className={cn(
            "pointer-events-none fixed right-4 z-40 flex flex-col items-end gap-2",
            raised ? "bottom-24 lg:bottom-6" : "bottom-6",
          )}
        >
          {showBubble && (
            <div
              role="status"
              className="flex items-center rounded-lg border bg-white py-0.5 pr-0.5 pl-3 text-sm font-semibold shadow-lg motion-safe:animate-in motion-safe:fade-in motion-safe:slide-in-from-bottom-2"
            >
              {/* Above a phone's form the text lets taps through to the controls under it. */}
              <button
                type="button"
                onClick={openChat}
                className={cn("py-2 pr-1 text-left", raised ? "lg:pointer-events-auto" : "pointer-events-auto")}
              >
                Tere! Kas saan aidata?
              </button>
              <button
                type="button"
                onClick={() => setShowBubble(false)}
                aria-label="Sulge tervitus"
                className="pointer-events-auto flex size-9 items-center justify-center rounded-md text-muted-foreground hover:bg-muted"
              >
                <X className="size-4" aria-hidden />
              </button>
            </div>
          )}

          <button
            type="button"
            onClick={openChat}
            aria-label="Ava vestlus Annaga"
            className={cn(
              "pointer-events-auto relative flex size-14 items-center justify-center rounded-full bg-primary text-primary-foreground shadow-lg transition-transform motion-safe:hover:scale-105",
              wantsAttention && "anna-pulse",
            )}
          >
            <MessageCircle className="size-6" aria-hidden />
            {badge > 0 && (
              <span className="absolute top-0 right-0 flex size-5 items-center justify-center rounded-full bg-amber-400 text-xs font-bold text-amber-950">
                {badge}
              </span>
            )}
          </button>
        </div>
      )}

      {open && (
        <div
          role="dialog"
          aria-label="Vestlus Annaga"
          className="fixed inset-x-3 top-3 bottom-3 z-50 flex flex-col overflow-hidden rounded-lg border bg-white shadow-xl sm:inset-x-auto sm:top-auto sm:right-6 sm:bottom-6 sm:h-[34rem] sm:max-h-[calc(100dvh-3rem)] sm:w-96"
        >
          <div className="flex items-center justify-between bg-primary px-4 py-3 text-primary-foreground">
            <p className="font-bold">Anna</p>
            <button
              type="button"
              onClick={() => setOpen(false)}
              aria-label="Sulge vestlus"
              className="flex size-10 items-center justify-center rounded-lg hover:bg-white/15"
            >
              <X className="size-5" aria-hidden />
            </button>
          </div>

          <div className="flex-1 space-y-3 overflow-y-auto bg-background p-4" aria-live="polite">
            {messages.map((message) => (
              <div
                key={message.id}
                className={cn(
                  "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
                  message.from === "bot" ? "bg-white shadow-sm" : "ml-auto bg-primary text-primary-foreground",
                )}
              >
                {message.text}
              </div>
            ))}

            {typing && (
              <div className="w-fit rounded-lg bg-white px-3 py-2 text-sm text-muted-foreground shadow-sm">
                Kirjutab...
              </div>
            )}
            <div ref={endRef} />
          </div>

          {/* Tips follow the form, so they stay outside the conversation. */}
          {tips.length > 0 && (
            <div className="max-h-32 space-y-2 overflow-y-auto border-t bg-accent/60 px-3 py-2">
              {tips.map((tip) => (
                <p key={tip.id} className="flex gap-2 text-sm leading-relaxed">
                  <Lightbulb className="mt-0.5 size-4 shrink-0 text-primary" aria-hidden />
                  <span>{tip.text}</span>
                </p>
              ))}
            </div>
          )}

          {chips.length > 0 && (
            <div className="flex gap-2 overflow-x-auto border-t bg-white px-3 py-2">
              {chips.map((chip) => (
                <button
                  key={chip.code}
                  type="button"
                  disabled={typing}
                  onClick={() => reply(chip.question, chip.answer)}
                  className="min-h-10 shrink-0 rounded-full border px-3 py-1.5 text-sm font-medium hover:border-primary hover:text-primary disabled:opacity-50"
                >
                  {chip.question}
                </button>
              ))}
            </div>
          )}

          <form onSubmit={handleSubmit} className="flex gap-2 border-t bg-white p-3">
            <Input
              value={input}
              onChange={(event) => setInput(event.target.value)}
              placeholder="Kirjuta küsimus…"
              aria-label="Sinu küsimus"
              maxLength={300}
            />
            <Button type="submit" size="icon" className="size-11 shrink-0" disabled={typing || !input.trim()} aria-label="Saada">
              <Send className="size-4" aria-hidden />
            </Button>
          </form>
        </div>
      )}
    </>
  );
}
