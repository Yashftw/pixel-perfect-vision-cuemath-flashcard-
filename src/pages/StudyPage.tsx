import Layout from "@/components/Layout";
import { PageHeader, SectionCard } from "@/components/Brutal";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { getDecks, getAllCards, submitReview } from "@/lib/api";
import { useState, useEffect, useMemo, useCallback, useRef } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import {
    Star, Timer, Lightbulb, RotateCcw, X, Frown, Check,
    Rocket, ArrowLeft, Settings2, ShieldQuestion, CheckCircle2,
    Zap, BookOpen, Flame
} from "lucide-react";
import { playClick, playFlip, playSuccess, playWrong } from "@/lib/sounds";

const RATINGS = [
    { id: "forgot", level: 1, Icon: X,      label: "Forgot",    hint: "See it again soon",  color: "bg-brand-red",    xp: 5  },
    { id: "hard",   level: 2, Icon: Frown,  label: "Hard",      hint: "Later today",         color: "bg-brand-yellow", xp: 15 },
    { id: "got",    level: 3, Icon: Check,  label: "Got it",    hint: "In a few days",       color: "bg-brand-green",  xp: 30 },
    { id: "easy",   level: 4, Icon: Rocket, label: "Too Easy!", hint: "In a week+",          color: "bg-brand-blue",   xp: 50 },
] as const;

type Rating = typeof RATINGS[number];
type TimerMode = "stopwatch" | "countdown" | "none";
type Difficulty = "easy" | "medium" | "hard" | "custom";

function getStorage<T>(key: string, fallback: T): T {
    const v = localStorage.getItem(key);
    return v !== null ? (v as unknown as T) : fallback;
}
function formatTime(secs: number) {
    return `${String(Math.floor(secs / 60)).padStart(2, "0")}:${String(secs % 60).padStart(2, "0")}`;
}
function stripHtml(html: string) {
    return new DOMParser().parseFromString(html, "text/html").body.textContent ?? "";
}
function fireConfetti() {
    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 }, colors: ["#5cb85c","#5bc0de","#f0ad4e","#d9534f"] });
}
function shuffle<T>(arr: T[]): T[] {
    return [...arr].sort(() => Math.random() - 0.5);
}

// ─── Difficulty Picker Modal ──────────────────────────────────────────────────
interface DiffPickerProps {
    totalCards: number;
    onStart: (difficulty: Difficulty, customCount: number) => void;
}

function DifficultyPicker({ totalCards, onStart }: DiffPickerProps) {
    const [selected, setSelected] = useState<Difficulty>("easy");
    const [customCount, setCustomCount] = useState(Math.min(30, totalCards));

    // Cap counts to what's actually available
    const easyCount = Math.min(5, totalCards);
    const mediumCount = Math.min(15, totalCards);
    const hardCount = Math.min(25, totalCards);

    const options: { id: Difficulty; icon: React.ReactNode; label: string; desc: string; count: number; color: string }[] = [
        { id: "easy",   icon: <BookOpen className="w-5 h-5" />, label: "Easy",       desc: "Easy warm-up",        count: easyCount,     color: "bg-brand-green"  },
        { id: "medium", icon: <Flame className="w-5 h-5" />,    label: "Medium",     desc: "Balanced session",    count: mediumCount,   color: "bg-brand-yellow" },
        { id: "hard",   icon: <Zap className="w-5 h-5" />,      label: "Hard",       desc: "Tough session",       count: hardCount,     color: "bg-brand-orange" },
        { id: "custom", icon: <Settings2 className="w-5 h-5" />,label: "Custom",     desc: "You pick the count",  count: customCount,   color: "bg-brand-purple" },
    ];

    const finalCount = selected === "custom" ? customCount : (options.find(o => o.id === selected)?.count ?? mediumCount);

    return (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
            <div className="brutal bg-card w-full max-w-md p-6 space-y-5 animate-fade-in">
                <div className="text-center">
                    <div className="font-display text-2xl mb-1">How hard today? 💪</div>
                    <p className="text-sm text-muted-foreground">{totalCards} cards available in this deck</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                    {options.map((opt) => (
                        <button
                            key={opt.id}
                            onClick={() => { setSelected(opt.id); playClick(); }}
                            className={`brutal-sm brutal-press p-4 text-left transition-all ${selected === opt.id ? opt.color + " ring-2 ring-border scale-[1.03]" : "bg-muted"}`}
                        >
                            <div className="mb-2">{opt.icon}</div>
                            <div className="font-bold text-sm">{opt.label}</div>
                            <div className="text-[11px] text-muted-foreground mt-0.5">{opt.desc}</div>
                            {opt.id !== "custom" && (
                                <div className="font-display text-lg mt-1">{opt.count} cards</div>
                            )}
                        </button>
                    ))}
                </div>

                {selected === "custom" && (
                    <div className="brutal-sm bg-muted p-3 space-y-2">
                        <label className="text-xs font-bold uppercase text-muted-foreground">
                            Number of cards: <span className="text-foreground">{customCount}</span>
                        </label>
                        <input
                            type="range"
                            min={5}
                            max={Math.min(30, totalCards)}
                            value={customCount}
                            onChange={(e) => setCustomCount(Number(e.target.value))}
                            className="w-full accent-brand-purple"
                        />
                        <div className="flex justify-between text-[10px] text-muted-foreground">
                            <span>5</span><span>{Math.min(30, totalCards)}</span>
                        </div>
                    </div>
                )}

                <button
                    onClick={() => { playClick(); onStart(selected, finalCount); }}
                    className="w-full brutal-sm brutal-press bg-brand-green py-3 font-bold text-base flex items-center justify-center gap-2"
                >
                    <Star className="w-5 h-5" /> Start — {finalCount} cards
                </button>
            </div>
        </div>
    );
}

// ─── Main Component ───────────────────────────────────────────────────────────
export default function StudyPage() {
    const { deckId } = useParams<{ deckId: string }>();
    const navigate = useNavigate();

    const [timerMode, setTimerMode]       = useState<TimerMode>(() => getStorage<TimerMode>("timerMode", "stopwatch"));
    const [countdownMins, setCountdownMins] = useState<number>(() => Number(getStorage("countdownMins", "10")));
    const [sessionSeconds, setSessionSeconds] = useState(0);
    const [activeCountdown, setActiveCountdown] = useState(() => Number(getStorage("countdownMins", "10")) * 60);

    // session state
    const [sessionCards, setSessionCards] = useState<any[]>([]);   // exact shuffled slice
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped]           = useState(false);
    const [showClue, setShowClue]         = useState(false);
    const [picked, setPicked]             = useState<string | null>(null);
    const [animating, setAnimating]       = useState(false);
    const [showNextOverlay, setShowNextOverlay] = useState(false);
    const [userAnswer, setUserAnswer]     = useState("");
    const [guessStatus, setGuessStatus]   = useState<"correct" | "wrong" | "none">("none");
    const [sessionEasys, setSessionEasys] = useState(0);
    const [showDiffPicker, setShowDiffPicker] = useState(true);  // show picker first
    const [sessionStarted, setSessionStarted] = useState(false);

    // data
    const { data: decks = [] } = useQuery({ queryKey: ["decks"], queryFn: getDecks });
    const deck = (decks as any[]).find((d) => d.id === deckId);

    const { data: allCards = [], isLoading } = useQuery({
        queryKey: ["all-cards", deckId],
        queryFn: () => getAllCards(deckId!),
        enabled: !!deckId,
    });

    const card = sessionCards[currentIndex] ?? null;
    // Only show "done" if we actually started AND went through all cards (sessionCards.length > 0 guard prevents false positive)
    const sessionDone = sessionStarted && !isLoading && sessionCards.length > 0 && currentIndex >= sessionCards.length;

    // ── timer ────────────────────────────────────────────────────────────────
    useEffect(() => {
        if (!sessionStarted || timerMode === "none") return;
        const id = setInterval(() => {
            setSessionSeconds((s) => s + 1);
            if (timerMode === "countdown") {
                setActiveCountdown((c) => {
                    if (c <= 1) {
                        toast.success("Time's up! Great effort today 🎉", { duration: 5000 });
                        navigate("/decks");
                        return 0;
                    }
                    return c - 1;
                });
            }
        }, 1000);
        return () => clearInterval(id);
    }, [sessionStarted, timerMode, navigate]);

    // ── start session ────────────────────────────────────────────────────────
    const startSession = useCallback((difficulty: Difficulty, count: number) => {
        if (allCards.length === 0) {
            toast.error("No cards found — the deck may still be generating. Try refreshing in a moment.");
            return;
        }
        // All cards are valid for a fresh deck (no card_states = new card = always show)
        const now = new Date();
        const due = (allCards as any[]).filter((c) => {
            const state = c.card_states?.[0];
            if (!state) return true; // brand-new card, always include
            return new Date(state.due_date) <= now;
        });
        const notDue = (allCards as any[]).filter((c) => {
            const state = c.card_states?.[0];
            if (!state) return false;
            return new Date(state.due_date) > now;
        });
        // Due first (shuffled), then not-due (shuffled) to fill up to count
        const pool = [...shuffle(due), ...shuffle(notDue)];
        const sliced = pool.slice(0, Math.min(count, pool.length));
        setSessionCards(sliced);
        setCurrentIndex(0);
        setFlipped(false);
        setShowClue(false);
        setPicked(null);
        setAnimating(false);
        setShowNextOverlay(false);
        setUserAnswer("");
        setGuessStatus("none");
        setSessionEasys(0);
        setSessionStarted(true);
        setShowDiffPicker(false);
        setSessionSeconds(0);
        setActiveCountdown(countdownMins * 60);
        playClick();
    }, [allCards, countdownMins]);

    // ── restart with new shuffle ─────────────────────────────────────────────
    const restartSession = useCallback(() => {
        setShowDiffPicker(true);
        setSessionStarted(false);
        setSessionCards([]);
        setCurrentIndex(0);
        playClick();
    }, []);

    // ── rate card ────────────────────────────────────────────────────────────
    const rate = useCallback((r: Rating) => {
        if (picked || !card || animating) return;
        setPicked(r.id);
        setAnimating(true);

        if (r.id === "got" || r.id === "easy") { fireConfetti(); playSuccess(); }
        else if (r.id === "forgot") playWrong();
        else playClick();

        if (r.id === "easy") {
            setSessionEasys((prev) => {
                const next = prev + 1;
                if (next === 5) toast.success("Speed Demon Badge unlocked! ⚡");
                return next;
            });
        }

        reviewMutation.mutate({ cardId: card.id, rating: r.level as 1 | 2 | 3 | 4 });

        setTimeout(() => setShowNextOverlay(true), 500);
        setTimeout(() => {
            setShowNextOverlay(false);
            setFlipped(false);
            setShowClue(false);
            setPicked(null);
            setAnimating(false);
            setUserAnswer("");
            setGuessStatus("none");
            setCurrentIndex((i) => i + 1);
        }, 1500);
    }, [picked, card, animating]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── keyboard shortcuts ───────────────────────────────────────────────────
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (document.activeElement?.tagName === "INPUT") return;
            if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                if (!flipped) handleFlip();
            } else if (flipped && !animating) {
                if (e.key === "1") rate(RATINGS[0]);
                if (e.key === "2") rate(RATINGS[1]);
                if (e.key === "3") rate(RATINGS[2]);
                if (e.key === "4") rate(RATINGS[3]);
            }
        };
        window.addEventListener("keydown", handleKeyDown);
        return () => window.removeEventListener("keydown", handleKeyDown);
    }, [flipped, animating, rate]); // eslint-disable-line react-hooks/exhaustive-deps

    // ── mutations ────────────────────────────────────────────────────────────
    const reviewMutation = useMutation({
        mutationFn: ({ cardId, rating }: { cardId: string; rating: 1 | 2 | 3 | 4 }) =>
            submitReview(cardId, rating),
        onError: () => toast.error("Failed to save review. Please try again."),
    });

    const handleFlip = () => {
        if (animating || !card) return;
        if (!flipped && userAnswer.trim()) {
            const normalize = (s: string) => s.toLowerCase().replace(/[^a-z0-9]/g, "").trim();
            const cleanUser = normalize(userAnswer);
            const cleanReal = normalize(stripHtml(card.answer));
            const match = cleanReal === cleanUser || (cleanUser.length > 3 && cleanReal.includes(cleanUser));
            if (match) { fireConfetti(); setGuessStatus("correct"); playSuccess(); }
            else { setGuessStatus("wrong"); playWrong(); }
        } else {
            playFlip();
        }
        setFlipped((f) => !f);
    };

    const changeTimerMode = (m: TimerMode) => { setTimerMode(m); localStorage.setItem("timerMode", m); playClick(); };

    if (isLoading) {
        return (
            <Layout>
                <div className="min-h-[60vh] grid place-items-center">
                    <div className="text-center space-y-3">
                        <div className="brutal-sm bg-brand-orange w-16 h-16 grid place-items-center mx-auto animate-float">
                            <Star className="w-7 h-7" />
                        </div>
                        <div className="font-display text-xl">Loading your cards...</div>
                        <p className="text-sm text-muted-foreground">Hang tight while we fetch your deck</p>
                    </div>
                </div>
            </Layout>
        );
    }

    return (
        <Layout>
            {/* Difficulty picker overlay */}
            {showDiffPicker && (
                <DifficultyPicker
                    totalCards={allCards.length || 1}
                    onStart={startSession}
                />
            )}

            <PageHeader
                tag={`Reviewing ${deck?.title ?? "Deck"}`}
                title="Play Time"
                subtitle="Master your concepts card by card."
                icon={<Star className="w-6 h-6" />}
                actions={
                    <button
                        onClick={() => { playClick(); navigate("/decks"); }}
                        className="brutal-sm bg-card px-4 py-2 flex items-center gap-2 font-bold text-sm brutal-press"
                    >
                        <ArrowLeft className="w-4 h-4" /> BACK
                    </button>
                }
            />

            <div className="grid lg:grid-cols-3 gap-6">
                {/* ── Sidebar ── */}
                <div className="lg:col-span-1 space-y-6">
                    <SectionCard title="Session Settings" icon={<Settings2 className="w-5 h-5" />}>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">Timer Mode</label>
                                <div className="flex bg-muted brutal-sm justify-between">
                                    {(["stopwatch", "countdown", "none"] as TimerMode[]).map((m, i) => (
                                        <button
                                            key={m}
                                            onClick={() => changeTimerMode(m)}
                                            className={`px-2 py-1.5 text-xs font-bold w-1/3 ${i > 0 ? "border-l-2 border-border" : ""} ${timerMode === m
                                                ? m === "stopwatch" ? "bg-brand-blue border-2 border-border"
                                                    : m === "countdown" ? "bg-brand-orange border-y-2 border-r-2 border-border"
                                                        : "bg-brand-red border-y-2 border-r-2 border-border"
                                                : ""}`}
                                        >
                                            {m === "stopwatch" ? "⌚ Watch" : m === "countdown" ? "⏰ Limit" : "🚫 None"}
                                        </button>
                                    ))}
                                </div>
                                {timerMode === "countdown" && (
                                    <div className="mt-2 flex gap-2 flex-wrap">
                                        {[5, 10, 15, 20, 30].map((m) => (
                                            <button
                                                key={m}
                                                onClick={() => {
                                                    setCountdownMins(m);
                                                    localStorage.setItem("countdownMins", String(m));
                                                    setActiveCountdown(m * 60);
                                                    playClick();
                                                }}
                                                className={`brutal-sm px-2 text-xs font-bold py-1 ${countdownMins === m ? "bg-brand-purple" : "bg-card"}`}
                                            >{m}m</button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            {/* Progress in current session */}
                            {sessionStarted && sessionCards.length > 0 && (
                                <div>
                                    <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">
                                        Session Progress
                                    </label>
                                    <div className="brutal-sm bg-muted h-3 overflow-hidden">
                                        <div
                                            className="h-full bg-brand-green transition-all duration-500"
                                            style={{ width: `${(currentIndex / sessionCards.length) * 100}%` }}
                                        />
                                    </div>
                                    <div className="text-[11px] text-muted-foreground mt-1">
                                        {currentIndex} / {sessionCards.length} done
                                    </div>
                                </div>
                            )}

                            <button
                                onClick={restartSession}
                                className="w-full brutal-sm brutal-press bg-brand-yellow px-3 py-2 font-bold text-xs flex items-center justify-center gap-1.5"
                            >
                                <RotateCcw className="w-3.5 h-3.5" /> Change Difficulty
                            </button>
                        </div>
                    </SectionCard>

                    <details className="group bg-card brutal border-2 border-border">
                        <summary
                            onClick={() => playClick()}
                            className="p-4 font-bold cursor-pointer select-none flex justify-between items-center bg-brand-blue/10"
                        >
                            <span className="flex items-center gap-2">
                                <ShieldQuestion className="w-5 h-5" /> What is Memory Mastery?
                            </span>
                        </summary>
                        <div className="p-4 pt-2 text-sm leading-relaxed space-y-3">
                            <p><strong>Memory Mastery</strong> means a card has a stability score above 21 days.</p>
                            <ul className="pl-4 space-y-1 mt-2 text-xs">
                                <li><span className="bg-brand-red/20 px-1 font-bold">😰 Forgot</span> → see it in 10 minutes</li>
                                <li><span className="bg-brand-yellow/30 px-1 font-bold">😐 Hard</span> → see it tomorrow</li>
                                <li><span className="bg-brand-green/30 px-1 font-bold">🙂 Got it</span> → see it in a few days</li>
                                <li><span className="bg-brand-blue/30 px-1 font-bold">🚀 Easy</span> → see it in a week or more</li>
                            </ul>
                            <p className="text-xs text-muted-foreground">Review cards consistently and they'll reach Mastery — shown on your Stats page.</p>
                        </div>
                    </details>
                </div>

                {/* ── Main card area ── */}
                <div className="lg:col-span-2 space-y-6">
                    {sessionStarted && !sessionDone && card ? (
                        <SectionCard
                            title={`Card ${currentIndex + 1} of ${sessionCards.length}`}
                            color="purple"
                            actions={
                                timerMode !== "none" ? (
                                    <span className="pill bg-card font-mono text-sm font-bold flex items-center gap-1">
                                        <Timer className="w-4 h-4" />
                                        {timerMode === "stopwatch" ? formatTime(sessionSeconds) : formatTime(activeCountdown)}
                                    </span>
                                ) : null
                            }
                        >
                            <button
                                onClick={handleFlip}
                                disabled={animating}
                                className={[
                                    "brutal bg-card w-full p-8 md:p-12 text-center min-h-[260px] grid place-items-center brutal-press disabled:opacity-100 disabled:cursor-default relative transition-all duration-300",
                                    guessStatus === "wrong" && flipped ? "animate-shake ring-4 ring-brand-red" : "",
                                    guessStatus === "correct" && flipped ? "ring-4 ring-brand-green" : "",
                                ].filter(Boolean).join(" ")}
                            >
                                <div className="animate-fade-in w-full">
                                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                                        {flipped ? "Answer" : "Question"}
                                    </div>
                                    <div
                                        className="font-display text-2xl md:text-3xl break-words"
                                        dangerouslySetInnerHTML={{ __html: flipped ? card.answer : card.question }}
                                    />
                                    {showClue && !flipped && card.hint && (
                                        <div className="mt-6 inline-flex items-center gap-1.5 pill bg-brand-yellow animate-bounce-in font-bold">
                                            <Lightbulb className="w-4 h-4" /> {card.hint}
                                        </div>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-8 inline-flex items-center gap-1 justify-center bg-muted px-2 py-1 brutal-sm">
                                        <RotateCcw className="w-3 h-3" /> tap or press space to flip
                                    </div>
                                </div>

                                {showNextOverlay && (
                                    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm grid place-items-center">
                                        <div className="font-display text-3xl animate-pop text-brand-orange">Next card…</div>
                                    </div>
                                )}
                            </button>

                            {!flipped && (
                                <div className="mt-4 animate-fade-in">
                                    <label className="text-xs uppercase font-bold text-muted-foreground block mb-2">
                                        Your Answer (Optional)
                                    </label>
                                    <input
                                        value={userAnswer}
                                        onChange={(e) => { setUserAnswer(e.target.value); setGuessStatus("none"); }}
                                        onKeyDown={(e) => { if (e.key === "Enter") handleFlip(); }}
                                        placeholder="Type what you remember..."
                                        className="brutal-sm bg-card w-full p-4 text-base font-display focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                    />
                                </div>
                            )}

                            <div className="flex justify-between gap-3 mt-4 flex-wrap">
                                <button
                                    onClick={() => { setShowClue(true); playClick(); }}
                                    disabled={flipped || animating}
                                    className="brutal-sm brutal-press bg-brand-yellow px-4 py-2 font-bold text-sm flex items-center gap-2 disabled:opacity-50"
                                >
                                    <Lightbulb className="w-4 h-4" /> GIVE ME A CLUE
                                </button>
                                {!flipped && (
                                    <button
                                        onClick={handleFlip}
                                        disabled={animating}
                                        className="brutal-sm brutal-press bg-card px-8 py-2 font-bold text-sm"
                                    >
                                        SHOW ANSWER
                                    </button>
                                )}
                            </div>

                            {flipped && (
                                <div className="mt-6 animate-fade-in">
                                    <div className="text-xs font-bold text-center mb-3 text-muted-foreground uppercase tracking-wider">
                                        How well did you know it?
                                    </div>
                                    <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                                        {RATINGS.map((r) => {
                                            const isPicked = picked === r.id;
                                            const dimmed = picked && !isPicked;
                                            return (
                                                <button
                                                    key={r.id}
                                                    onClick={() => rate(r)}
                                                    disabled={animating}
                                                    className={[
                                                        "brutal-sm brutal-press py-4 px-2 text-center relative overflow-hidden transition-all",
                                                        isPicked ? "bg-brand-green ring-4 ring-border scale-105 z-10" : r.color,
                                                        dimmed ? "opacity-30 grayscale blur-[1px]" : "hover:-translate-y-1",
                                                    ].join(" ")}
                                                >
                                                    <div className="grid place-items-center mb-1 h-7">
                                                        <r.Icon className="w-6 h-6" strokeWidth={2.5} />
                                                    </div>
                                                    <div className="font-bold text-sm">{r.label}</div>
                                                    <div className="text-[10px] opacity-80 mt-1">{r.hint}</div>
                                                    {isPicked && (
                                                        <div className="absolute inset-0 grid place-items-center pointer-events-none bg-black/10">
                                                            <Check className="w-12 h-12 text-white/50" />
                                                        </div>
                                                    )}
                                                </button>
                                            );
                                        })}
                                    </div>
                                </div>
                            )}
                        </SectionCard>
                    ) : sessionDone ? (
                        /* ── Session complete ── */
                        <div className="brutal bg-card p-8 md:p-12 text-center space-y-5 animate-fade-in">
                            <div className="brutal-sm bg-brand-green w-16 h-16 grid place-items-center mx-auto mb-2">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-3xl font-display">Session complete! 🎉</h2>
                            <p className="text-muted-foreground max-w-sm mx-auto text-sm leading-relaxed">
                                You reviewed <strong>{sessionCards.length} cards</strong> in {formatTime(sessionSeconds)}.
                                Want another round with a fresh shuffle?
                            </p>
                            <div className="flex flex-col sm:flex-row justify-center gap-4 pt-4">
                                <button
                                    onClick={() => { playClick(); navigate("/decks"); }}
                                    className="brutal-sm bg-card px-6 py-3 font-bold brutal-press text-sm"
                                >
                                    Return to Decks
                                </button>
                                <button
                                    onClick={restartSession}
                                    className="brutal-sm bg-brand-yellow px-6 py-3 font-bold flex items-center justify-center gap-2 brutal-press text-sm"
                                >
                                    <RotateCcw className="w-4 h-4" /> New Round
                                </button>
                            </div>
                        </div>
                    ) : (
                        <div className="brutal bg-card p-8 text-center text-muted-foreground">
                            {isLoading ? "Loading cards..." : "Pick a difficulty to start!"}
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
