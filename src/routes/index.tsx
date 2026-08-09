import { createFileRoute } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { ArrowRight, CircleDot, RotateCcw, Target, Terminal } from "lucide-react";
import {
  Conversation,
  ConversationContent,
  ConversationScrollButton,
} from "@/components/ai-elements/conversation";
import { Message, MessageContent, MessageResponse } from "@/components/ai-elements/message";
import {
  PromptInput,
  PromptInputFooter,
  PromptInputSubmit,
  PromptInputTextarea,
} from "@/components/ai-elements/prompt-input";
import { Shimmer } from "@/components/ai-elements/shimmer";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import candidatesJson from "@/data/candidates.json";
import curriculumJson from "@/data/curriculum.json";
import type {
  CandidateProfile,
  Curriculum,
  InterviewFeedback,
  InterviewMeta,
} from "@/lib/interview-types";
import miraLogo from "@/assets/mira-logo.png";

const candidates = (candidatesJson as { candidates: CandidateProfile[] }).candidates;
const curriculum = curriculumJson as Curriculum;

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Mira · AI Interview Agent for the 31-Day AI Cohort" },
      {
        name: "description",
        content:
          "Mira runs adaptive, multi-turn technical interviews grounded in each candidate's real AI Cohort learning journey, then returns structured feedback.",
      },
      { property: "og:title", content: "Mira · AI Interview Agent" },
      {
        property: "og:description",
        content:
          "Adaptive technical interviews built from the 31-day AI Cohort curriculum and each candidate's mission history.",
      },
    ],
  }),
  component: Home,
});

type ChatMessage = { id: string; role: "user" | "assistant"; text: string };

function dayTitle(day: number) {
  return curriculum.days.find((d) => d.day === day)?.title ?? `Day ${day}`;
}

function Home() {
  const [candidate, setCandidate] = useState<CandidateProfile>(candidates[0]!);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [meta, setMeta] = useState<InterviewMeta | null>(null);
  const [feedback, setFeedback] = useState<InterviewFeedback | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const done = Boolean(feedback);

  const focusTextarea = useCallback(() => {
    requestAnimationFrame(() => textareaRef.current?.focus());
  }, []);

  useEffect(() => {
    if (sessionId && !done && !busy) focusTextarea();
  }, [sessionId, done, busy, focusTextarea]);

  const post = useCallback(async (body: Record<string, unknown>) => {
    const res = await fetch("/api/interview", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    });
    const data = (await res.json()) as {
      reply?: string;
      done?: boolean;
      feedback?: InterviewFeedback;
      meta?: InterviewMeta;
      error?: string;
    };
    if (!res.ok) throw new Error(data.error ?? `Request failed (${res.status})`);
    return data;
  }, []);

  const start = useCallback(
    async (profile: CandidateProfile) => {
      const id = crypto.randomUUID();
      setBusy(true);
      setError(null);
      setFeedback(null);
      setMessages([]);
      setMeta(null);
      try {
        const data = await post({ sessionId: id, candidate: profile });
        setSessionId(id);
        setMeta(data.meta ?? null);
        setMessages([{ id: crypto.randomUUID(), role: "assistant", text: data.reply ?? "" }]);
      } catch (e) {
        setError(e instanceof Error ? e.message : "Could not start the interview.");
      } finally {
        setBusy(false);
      }
    },
    [post],
  );

  const send = useCallback(async () => {
    const text = input.trim();
    if (!text || !sessionId || busy || done) return;
    setInput("");
    setError(null);
    setMessages((prev) => [...prev, { id: crypto.randomUUID(), role: "user", text }]);
    setBusy(true);
    try {
      const data = await post({ sessionId, message: text });
      setMeta(data.meta ?? null);
      setMessages((prev) => [
        ...prev,
        { id: crypto.randomUUID(), role: "assistant", text: data.reply ?? "" },
      ]);
      if (data.feedback) setFeedback(data.feedback);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong.");
    } finally {
      setBusy(false);
      focusTextarea();
    }
  }, [busy, done, focusTextarea, input, post, sessionId]);

  const progress = useMemo(() => {
    if (!meta) return 0;
    return Math.round((meta.questionNumber / meta.totalQuestions) * 100);
  }, [meta]);

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-7xl flex-col gap-6 px-4 py-8 lg:px-8">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <img
            src={miraLogo}
            alt="Mira interview agent logo"
            width={1024}
            height={1024}
            className="size-11 shrink-0"
          />
          <div>
            <h1 className="text-2xl font-semibold">Mira</h1>
            <p className="text-sm text-muted-foreground">
              Adaptive technical interviews for the {curriculum.cohort}
            </p>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <span className="eyebrow hidden sm:inline">POST /api/interview</span>
          {sessionId ? (
            <Button variant="outline" size="sm" onClick={() => void start(candidate)} disabled={busy}>
              <RotateCcw /> Restart
            </Button>
          ) : null}
        </div>
      </header>

      <div className="grid flex-1 gap-6 lg:grid-cols-[320px_1fr]">
        <aside className="panel flex h-fit flex-col gap-5 p-5">
          <div>
            <p className="eyebrow">Candidate</p>
            <select
              value={candidate.member.id}
              onChange={(e) => {
                const next = candidates.find((c) => c.member.id === e.target.value);
                if (next) {
                  setCandidate(next);
                  setSessionId(null);
                  setMessages([]);
                  setFeedback(null);
                  setMeta(null);
                }
              }}
              className="mt-2 w-full rounded-lg border border-input bg-background/60 px-3 py-2 text-sm text-foreground outline-none focus:ring-1 focus:ring-ring"
            >
              {candidates.map((c) => (
                <option key={c.member.id} value={c.member.id}>
                  {c.member.name} — {c.member.jobRole}
                </option>
              ))}
            </select>
          </div>

          <dl className="grid grid-cols-3 gap-2 text-center">
            {[
              { label: "Commit days", value: candidate.signals.commitDays },
              { label: "Missions", value: candidate.signals.missionsCompleted },
              { label: "First try", value: candidate.signals.missionsFirstTry },
            ].map((s) => (
              <div key={s.label} className="rounded-lg bg-secondary/60 px-2 py-3">
                <dt className="text-[0.65rem] uppercase tracking-wide text-muted-foreground">
                  {s.label}
                </dt>
                <dd className="font-display text-xl font-semibold text-primary">{s.value}</dd>
              </div>
            ))}
          </dl>

          <div>
            <p className="eyebrow">Mission history</p>
            <ul className="mt-2 max-h-64 space-y-1.5 overflow-y-auto pr-1 text-sm">
              {candidate.missions.map((m) => (
                <li key={m.day} className="flex items-start justify-between gap-2">
                  <span className="text-muted-foreground">
                    <span className="text-foreground">D{m.day}</span> {m.title}
                  </span>
                  <span
                    className={cn(
                      "shrink-0 rounded-full px-2 py-0.5 text-[0.65rem] font-medium",
                      m.skipped
                        ? "bg-destructive/15 text-destructive"
                        : (m.attempts ?? 0) >= 4
                          ? "bg-warning/15 text-warning"
                          : "bg-success/15 text-success",
                    )}
                  >
                    {m.skipped ? "skipped" : `${m.attempts}×`}
                  </span>
                </li>
              ))}
            </ul>
          </div>

          {meta ? (
            <div>
              <p className="eyebrow flex items-center gap-1.5">
                <Target className="size-3" /> Interview plan
              </p>
              <ul className="mt-2 space-y-1 text-sm">
                {meta.focusDays.map((d) => (
                  <li key={d.day} className="flex items-center gap-2">
                    <CircleDot
                      className={cn(
                        "size-3 shrink-0",
                        meta.coveredDays.includes(d.day) ? "text-primary" : "text-muted-foreground",
                      )}
                    />
                    <span
                      className={
                        meta.coveredDays.includes(d.day) ? "text-foreground" : "text-muted-foreground"
                      }
                    >
                      Day {d.day} · {d.title}
                    </span>
                  </li>
                ))}
              </ul>
            </div>
          ) : null}
        </aside>

        <section className="panel flex min-h-[70vh] flex-col overflow-hidden">
          {meta ? (
            <div className="border-b border-border px-5 py-3">
              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>
                  Question {Math.min(meta.questionNumber, meta.totalQuestions)} of{" "}
                  {meta.totalQuestions}
                </span>
                <span>
                  {meta.coveredDays.length} curriculum day
                  {meta.coveredDays.length === 1 ? "" : "s"} covered
                </span>
              </div>
              <div className="mt-2 h-1 w-full overflow-hidden rounded-full bg-secondary">
                <div
                  className="h-full rounded-full bg-primary transition-all duration-500"
                  style={{ width: `${progress}%` }}
                />
              </div>
            </div>
          ) : null}

          {!sessionId ? (
            <div className="flex flex-1 flex-col items-center justify-center gap-5 px-6 py-16 text-center">
              <img
                src={miraLogo}
                alt=""
                width={1024}
                height={1024}
                className="size-20 opacity-90"
                loading="lazy"
              />
              <div className="max-w-md">
                <h2 className="text-xl font-semibold">
                  Interview {candidate.member.name.split(" ")[0]}
                </h2>
                <p className="mt-2 text-sm text-muted-foreground">
                  Mira reads {candidate.member.name.split(" ")[0]}'s mission history, picks five
                  curriculum days worth probing — the confident ones and the shaky ones — then runs a
                  nine-question conversational interview with live follow-ups.
                </p>
              </div>
              <Button size="lg" onClick={() => void start(candidate)} disabled={busy}>
                {busy ? "Preparing…" : "Start interview"} <ArrowRight />
              </Button>
              {error ? <p className="text-sm text-destructive">{error}</p> : null}
            </div>
          ) : (
            <>
              <Conversation className="flex-1">
                <ConversationContent className="gap-6">
                  {messages.map((m) => (
                    <Message key={m.id} from={m.role}>
                      <MessageContent>
                        {m.role === "assistant" ? (
                          <MessageResponse>{m.text}</MessageResponse>
                        ) : (
                          <p className="whitespace-pre-wrap">{m.text}</p>
                        )}
                      </MessageContent>
                    </Message>
                  ))}

                  {busy ? (
                    <Message from="assistant">
                      <MessageContent>
                        <Shimmer>Mira is thinking…</Shimmer>
                      </MessageContent>
                    </Message>
                  ) : null}

                  {feedback ? (
                    <div className="mt-2 rounded-xl border border-primary/30 bg-primary/5 p-5">
                      <p className="eyebrow flex items-center gap-1.5">
                        <Terminal className="size-3" /> Structured feedback
                      </p>
                      <p className="mt-3 text-sm leading-relaxed">{feedback.summary}</p>
                      <div className="mt-5 grid gap-5 sm:grid-cols-3">
                        {[
                          { title: "Strengths", items: feedback.strengths, tone: "text-success" },
                          { title: "Gaps", items: feedback.gaps, tone: "text-warning" },
                          { title: "Next steps", items: feedback.next, tone: "text-accent" },
                        ].map((block) => (
                          <div key={block.title}>
                            <h3 className={cn("text-sm font-semibold", block.tone)}>
                              {block.title}
                            </h3>
                            <ul className="mt-2 space-y-1.5 text-sm text-muted-foreground">
                              {block.items.map((item, i) => (
                                <li key={i}>• {item}</li>
                              ))}
                            </ul>
                          </div>
                        ))}
                      </div>
                    </div>
                  ) : null}
                </ConversationContent>
                <ConversationScrollButton />
              </Conversation>

              <div className="border-t border-border p-4">
                {error ? <p className="mb-2 text-sm text-destructive">{error}</p> : null}
                {done ? (
                  <div className="flex flex-wrap items-center justify-between gap-3">
                    <p className="text-sm text-muted-foreground">
                      Interview complete — feedback delivered above.
                    </p>
                    <Button variant="outline" onClick={() => void start(candidate)}>
                      <RotateCcw /> Run again
                    </Button>
                  </div>
                ) : (
                  <PromptInput
                    onSubmit={(_, event) => {
                      event.preventDefault();
                      void send();
                    }}
                  >
                    <PromptInputTextarea
                      ref={textareaRef}
                      value={input}
                      onChange={(e) => setInput(e.target.value)}
                      placeholder="Answer as the candidate…"
                      disabled={busy}
                    />
                    <PromptInputFooter className="justify-end">
                      <PromptInputSubmit
                        {...(busy ? { status: "submitted" as const } : {})}
                        disabled={busy || !input.trim()}
                      />
                    </PromptInputFooter>
                  </PromptInput>
                )}
              </div>
            </>
          )}
        </section>
      </div>
    </main>
  );
}
