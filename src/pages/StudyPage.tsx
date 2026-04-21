import Layout from "@/components/Layout";
import { PageHeader, SectionCard } from "@/components/Brutal";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDecks, getDueCards, submitReview } from "@/lib/api";
import { useState, useEffect, useMemo } from "react";
import { toast } from "sonner";
import confetti from "canvas-confetti";
import { Star, Timer, Lightbulb, RotateCcw, X, Frown, Check, Rocket, ArrowLeft, Settings2, ShieldQuestion, CheckCircle2 } from "lucide-react";
import { useAuth } from "../hooks/useAuth";

const RATINGS = [
    { id: "forgot", level: 1, Icon: X, label: "Forgot", hint: "See it again very soon", color: "bg-brand-red", xp: 5 },
    { id: "hard", level: 2, Icon: Frown, label: "Hard", hint: "Later today", color: "bg-brand-yellow", xp: 15 },
    { id: "got", level: 3, Icon: Check, label: "Got it", hint: "In a few days", color: "bg-brand-green", xp: 30 },
    { id: "easy", level: 4, Icon: Rocket, label: "Too Easy!", hint: "In a week", color: "bg-brand-blue", xp: 50 },
] as const;

export default function StudyPage() {
    const { deckId } = useParams();
    const navigate = useNavigate();
    const queryClient = useQueryClient();
    const { user } = useAuth();

    // Timer and Difficulty Settings from LocalStorage
    const [timerMode, setTimerMode] = useState<"stopwatch" | "countdown" | "none">(
        (localStorage.getItem("timerMode") as any) || "stopwatch"
    );
    const [countdownMins, setCountdownMins] = useState(
        Number(localStorage.getItem("countdownMins")) || 10
    );
    const [difficulty, setDifficulty] = useState<"chill" | "standard" | "beast">(
        (localStorage.getItem("difficulty") as any) || "standard"
    );

    const [sessionSeconds, setSessionSeconds] = useState(0);
    const [activeCountdown, setActiveCountdown] = useState(countdownMins * 60);

    // Flashcard State
    const [currentIndex, setCurrentIndex] = useState(0);
    const [flipped, setFlipped] = useState(false);
    const [showClue, setShowClue] = useState(false);

    // Animation/Delay states
    const [picked, setPicked] = useState<string | null>(null);
    const [animating, setAnimating] = useState(false);
    const [countdownToNext, setCountdownToNext] = useState<number | null>(null);
    const [userAnswer, setUserAnswer] = useState("");
    const [guessStatus, setGuessStatus] = useState<"correct" | "wrong" | "none">("none");

    // Speed Demon tracker
    const [sessionEasys, setSessionEasys] = useState(0);

    const { data: decks = [] } = useQuery({ queryKey: ["decks"], queryFn: getDecks });
    const deck = decks.find(d => d.id === deckId);

    const { data: allDueCards = [], isLoading } = useQuery({
        queryKey: ["cards", deckId],
        queryFn: () => getDueCards(deckId!),
        enabled: !!deckId
    });

    const [shuffledIds, setShuffledIds] = useState<string[]>([]);

    useEffect(() => {
        if (allDueCards.length > 0 && shuffledIds.length === 0) {
            const pool = [...allDueCards];
            for (let i = pool.length - 1; i > 0; i--) {
                const j = Math.floor(Math.random() * (i + 1));
                [pool[i], pool[j]] = [pool[j], pool[i]];
            }
            setShuffledIds(pool.map(c => c.id));
        }
    }, [allDueCards]);

    // Apply difficulty limits
    const deckCards = useMemo(() => {
        if (!shuffledIds.length) return [];
        const limit = difficulty === "chill" ? 10 : difficulty === "standard" ? 20 : allDueCards.length;
        const limitedIds = shuffledIds.slice(0, limit);
        return limitedIds.map(id => allDueCards.find(c => c.id === id)).filter(Boolean);
    }, [allDueCards, shuffledIds, difficulty]);

    useEffect(() => {
        if (timerMode === "none") return;
        const i = setInterval(() => {
            setSessionSeconds(s => s + 1);
            if (timerMode === "countdown") {
                setActiveCountdown(c => {
                    if (c <= 1) {
                        toast.success("Time's up! Great effort today 🎉", { duration: 5000 });
                        navigate("/decks");
                        return 0;
                    }
                    return c - 1;
                });
            }
        }, 1000);
        return () => clearInterval(i);
    }, [timerMode, countdownMins, navigate]);

    const reviewMutation = useMutation({
        mutationFn: ({ cardId, rating }: { cardId: string, rating: 1 | 2 | 3 | 4 }) => submitReview(cardId, rating),
        onSuccess: () => { } // rely on silent background re-pull or local splice if needed
    });

    const card = deckCards[currentIndex];

    // Persist settings changes
    const changeTimerMode = (m: "stopwatch" | "countdown" | "none") => {
        setTimerMode(m); localStorage.setItem("timerMode", m);
    };
    const changeDiff = (d: "chill" | "standard" | "beast") => {
        setDifficulty(d); localStorage.setItem("difficulty", d);
    };

    const stripHtml = (html: string) => {
        const doc = new DOMParser().parseFromString(html, 'text/html');
        return doc.body.textContent || "";
    };

    const handleUserAnswerChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setUserAnswer(e.target.value);
        if (guessStatus !== "none") setGuessStatus("none");
    };

    const handleFlip = () => {
        if (animating) return;
        if (!flipped) {
            if (userAnswer.trim()) {
                const cleanUser = userAnswer.toLowerCase().replace(/[^a-z0-9]/g, '');
                const cleanReal = stripHtml(card.answer).toLowerCase().replace(/[^a-z0-9]/g, '');
                const match = cleanReal === cleanUser || (cleanUser.length > 2 && cleanReal.includes(cleanUser));

                if (match) {
                    confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 }, colors: ["#5cb85c", "#5bc0de", "#f0ad4e", "#d9534f"] });
                    setGuessStatus("correct");
                } else {
                    setGuessStatus("wrong");
                }
            } else {
                setGuessStatus("none");
            }
        }
        setFlipped(!flipped);
    };

    const next = () => {
        setFlipped(false); setShowClue(false); setPicked(null); setAnimating(false); setCountdownToNext(null);
        setUserAnswer("");
        setGuessStatus("none");
        if (currentIndex + 1 >= deckCards.length) {
            toast.success("🎉 You've finished all due cards for this session!", { duration: 4000 });
            navigate("/decks");
        } else {
            setCurrentIndex(i => i + 1);
        }
    };

    const rate = (r: typeof RATINGS[number]) => {
        if (picked || !card || animating) return;

        setPicked(r.id);
        setAnimating(true);

        if (r.id === "got" || r.id === "easy") {
            confetti({ particleCount: 60, spread: 70, origin: { y: 0.7 }, colors: ["#5cb85c", "#5bc0de", "#f0ad4e", "#d9534f"] });
        }

        if (r.id === "easy") {
            const nextEasys = sessionEasys + 1;
            setSessionEasys(nextEasys);
            if (nextEasys === 5) {
                toast.success("Speed Demon Badge unlocked! ⚡");
                // The API actually evaluates this implicitly if we save it, but requirement says "track locally"
            }
        }

        reviewMutation.mutate({ cardId: card.id, rating: r.level as any });

        setTimeout(() => setCountdownToNext(1), 500);
        setTimeout(() => next(), 1500);
    };

    const formatTime = (secs: number) => {
        const mm = String(Math.floor(secs / 60)).padStart(2, "0");
        const ss = String(secs % 60).padStart(2, "0");
        return `${mm}:${ss}`;
    };

    if (isLoading && !card) return <Layout><div className="p-12 text-center">Loading session...</div></Layout>;

    return (
        <Layout>
            <PageHeader
                tag={`Reviewing ${deck?.title || "Deck"}`}
                title="Play Time"
                subtitle="Master your concepts card by card."
                icon={<Star className="w-6 h-6" />}
                actions={
                    <button onClick={() => navigate("/decks")} className="brutal-sm bg-card px-4 py-2 flex items-center gap-2 font-bold text-sm brutal-press">
                        <ArrowLeft className="w-4 h-4" /> BACK
                    </button>
                }
            />

            <div className="grid lg:grid-cols-3 gap-6">

                {/* SETTINGS PANEL */}
                <div className="lg:col-span-1 space-y-6">
                    <SectionCard title="Session Settings" icon={<Settings2 className="w-5 h-5" />}>
                        <div className="space-y-4">
                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">Timer Mode</label>
                                <div className="flex bg-muted brutal-sm justify-between">
                                    <button onClick={() => changeTimerMode("stopwatch")} className={`px-2 py-1.5 text-xs font-bold w-1/3 ${timerMode === "stopwatch" ? "bg-brand-blue border-2 border-border" : ""}`}>⌚ Stopwatch</button>
                                    <button onClick={() => changeTimerMode("countdown")} className={`px-2 py-1.5 text-xs font-bold w-1/3 border-l-2 border-border ${timerMode === "countdown" ? "bg-brand-orange border-y-2 border-r-2 border-border" : ""}`}>⏰ Limit</button>
                                    <button onClick={() => changeTimerMode("none")} className={`px-2 py-1.5 text-xs font-bold w-1/3 border-l-2 border-border ${timerMode === "none" ? "bg-brand-red border-y-2 border-r-2 border-border" : ""}`}>🚫 None</button>
                                </div>
                                {timerMode === "countdown" && (
                                    <div className="mt-2 flex gap-2">
                                        {[5, 10, 15, 20, 30].map(m => (
                                            <button key={m} onClick={() => { setCountdownMins(m); localStorage.setItem("countdownMins", m.toString()); setActiveCountdown(m * 60); }} className={`brutal-sm px-2 text-xs font-bold py-1 ${countdownMins === m ? 'bg-brand-purple text-white' : 'bg-card'}`}>{m}m</button>
                                        ))}
                                    </div>
                                )}
                            </div>

                            <div>
                                <label className="text-xs font-bold uppercase text-muted-foreground mb-2 block">Difficulty Limit</label>
                                <div className="space-y-2">
                                    <button onClick={() => changeDiff("chill")} className={`w-full brutal-sm px-3 py-2 text-left font-bold text-sm ${difficulty === "chill" ? "bg-brand-green" : "bg-card"}`}>🌱 Chill (10 cards max)</button>
                                    <button onClick={() => changeDiff("standard")} className={`w-full brutal-sm px-3 py-2 text-left font-bold text-sm ${difficulty === "standard" ? "bg-brand-yellow" : "bg-card"}`}>🔥 Standard (20 cards max)</button>
                                    <button onClick={() => changeDiff("beast")} className={`w-full brutal-sm px-3 py-2 text-left font-bold text-sm ${difficulty === "beast" ? "bg-brand-orange" : "bg-card"}`}>⚡ Beast Mode (All Due)</button>
                                </div>
                            </div>
                        </div>
                    </SectionCard>

                    <details className="group bg-card brutal border-2 border-border">
                        <summary className="p-4 font-bold cursor-pointer select-none flex justify-between items-center bg-brand-blue/10">
                            <span className="flex items-center gap-2"><ShieldQuestion className="w-5 h-5" /> What is Memory Mastery?</span>
                        </summary>
                        <div className="p-4 pt-2 text-sm leading-relaxed space-y-3">
                            <p><strong>Memory Mastery</strong> means a card has a stability score above 21 days — meaning your brain will remember it for at least 3 weeks without reviewing it.</p>
                            <p>Cards start as <strong>New</strong> → become <strong>Learning</strong> → graduate to <strong>Review</strong> → eventually reach <strong>Mastered</strong>.</p>
                            <div className="space-y-1 mt-2 text-xs">
                                <p>The 4 rating buttons directly control when you see each card again:</p>
                                <ul className="pl-4 space-y-1">
                                    <li><span className="bg-brand-red/20 px-1 font-bold">😰 Again</span> → see it in 10 minutes</li>
                                    <li><span className="bg-brand-yellow/30 px-1 font-bold">😐 Hard</span> → see it tomorrow</li>
                                    <li><span className="bg-brand-green/30 px-1 font-bold">🙂 Good</span> → see it in a few days</li>
                                    <li><span className="bg-brand-blue/30 px-1 font-bold">🚀 Easy</span> → see it in a week or more</li>
                                </ul>
                            </div>
                            <p className="text-xs bg-muted p-2 brutal-sm"><strong>Tip:</strong> Be honest! Rating everything Easy slows down your actual learning retention.</p>
                        </div>
                    </details>
                </div>

                {/* STUDY AREA */}
                <div className="lg:col-span-2 space-y-6">
                    {deckCards.length > 0 && card ? (
                        <SectionCard
                            title={`Card ${currentIndex + 1} of ${deckCards.length}`}
                            color="purple"
                            actions={
                                <>
                                    {timerMode !== "none" && (
                                        <span className="pill bg-card font-mono text-sm font-bold">
                                            <Timer className="w-4 h-4" />
                                            {timerMode === "stopwatch" ? formatTime(sessionSeconds) : formatTime(activeCountdown)}
                                        </span>
                                    )}
                                </>
                            }
                        >
                            <button
                                onClick={handleFlip}
                                disabled={animating}
                                className={`brutal bg-card w-full p-8 md:p-12 text-center min-h-[260px] grid place-items-center brutal-press disabled:opacity-100 disabled:cursor-default relative transition-all duration-300 ${guessStatus === 'wrong' && flipped ? 'animate-shake ring-4 ring-brand-red' : ''} ${guessStatus === 'correct' && flipped ? 'ring-4 ring-brand-green' : ''}`}
                            >
                                <div className="animate-fade-in w-full">
                                    <div className="text-xs uppercase tracking-widest text-muted-foreground mb-4">
                                        {flipped ? "Answer" : "Question"}
                                    </div>
                                    <div className="font-display text-2xl md:text-3xl break-words" dangerouslySetInnerHTML={{ __html: flipped ? card.answer : card.question }}></div>
                                    {showClue && !flipped && card.hint && (
                                        <div className="mt-6 inline-flex items-center gap-1.5 pill bg-brand-yellow animate-bounce-in font-bold">
                                            <Lightbulb className="w-4 h-4" /> *{card.hint}*
                                        </div>
                                    )}
                                    <div className="text-xs text-muted-foreground mt-8 inline-flex items-center gap-1 justify-center bg-muted px-2 py-1 brutal-sm">
                                        <RotateCcw className="w-3 h-3" /> tap card to flip
                                    </div>
                                </div>
                                {countdownToNext && (
                                    <div className="absolute inset-0 bg-background/90 backdrop-blur-sm grid place-items-center">
                                        <div className="font-display text-3xl animate-pop text-brand-orange">
                                            Next card in {countdownToNext}...
                                        </div>
                                    </div>
                                )}
                            </button>

                            {!flipped && (
                                <div className="mt-4 animate-fade-in">
                                    <label className="text-xs uppercase font-bold text-muted-foreground block mb-2">Your Answer (Optional)</label>
                                    <input
                                        value={userAnswer}
                                        onChange={handleUserAnswerChange}
                                        onKeyDown={(e) => { if (e.key === 'Enter') handleFlip(); }}
                                        placeholder="Type what you remember..."
                                        className="brutal-sm bg-card w-full p-4 text-base font-display focus:outline-none focus:ring-2 focus:ring-brand-blue"
                                    />
                                </div>
                            )}

                            <div className="flex justify-between gap-3 mt-4 flex-wrap">
                                <button
                                    onClick={() => setShowClue(true)}
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
                                                    className={`brutal-sm brutal-press py-4 px-2 text-center relative overflow-hidden transition-all ${isPicked ? "bg-brand-green ring-4 ring-border scale-105 z-10" : r.color
                                                        } ${dimmed ? "opacity-30 grayscale blur-[1px]" : "hover:-translate-y-1"}`}
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
                    ) : (
                        <div className="brutal bg-card p-12 text-center space-y-4">
                            <div className="brutal-sm bg-brand-green w-16 h-16 grid place-items-center mx-auto mb-4">
                                <CheckCircle2 className="w-8 h-8" />
                            </div>
                            <h2 className="text-2xl font-display">All caught up!</h2>
                            <p className="text-muted-foreground">You have reviewed all due cards for this deck today.</p>
                            <button onClick={() => navigate("/decks")} className="brutal-sm bg-brand-orange px-6 py-2 font-bold">Return to Decks</button>
                        </div>
                    )}
                </div>
            </div>
        </Layout>
    );
}
