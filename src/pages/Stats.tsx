import Layout from "@/components/Layout";
import { PageHeader, SectionCard } from "@/components/Brutal";
import { Brain, Sprout, Flame, Gauge, TrendingUp, Zap, Star, AlertTriangle, CheckCircle2, BookOpen, RotateCcw } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDecks, getDeckStats, getProfile } from "@/lib/api";
import { useMemo } from "react";

// ─── FSRS Stats Engine ────────────────────────────────────────────────────────
// A card is "Locked In" (mastered) when its stability interval > 3 days.
// Memory Mastery = % of total cards that are Locked In.
// Refresh Meter (Health) = % of cards NOT currently overdue (due <= 0).

interface Card {
  id: string;
  stability?: number;   // days — from FSRS scheduler
  due?: string | null;  // ISO date string or null
  [key: string]: any;
}

interface DeckStatRaw {
  mastered: number;
  total: number;
  due: number;
  health: number;       // 0–100, higher = less rusty
  deck: any;
}

/** Derive FSRS-based stats from a raw card array (if available on the deck object).
 *  Falls back gracefully to the server-side mastered/due/total numbers. */
function computeFsrsStats(deck: any, serverStats: { mastered: number; total: number; due: number }): DeckStatRaw {
  const cards: Card[] = deck?.cards ?? [];

  if (cards.length === 0) {
    // No card-level data — use server totals, estimate health
    const health = serverStats.total > 0
      ? Math.round(((serverStats.total - serverStats.due) / serverStats.total) * 100)
      : 100;
    return { ...serverStats, health, deck };
  }

  const now = new Date();
  let mastered = 0;
  let overdue = 0;

  for (const card of cards) {
    // Locked In: stability > 3 days
    if ((card.stability ?? 0) > 3) mastered++;

    // Overdue: due date exists and is in the past
    if (card.due) {
      const dueDate = new Date(card.due);
      if (!isNaN(dueDate.getTime()) && dueDate < now) overdue++;
    }
  }

  const total = cards.length;
  const health = total > 0 ? Math.round(((total - overdue) / total) * 100) : 100;

  return { mastered, total, due: overdue, health, deck };
}

// ─── Activity grid helpers ────────────────────────────────────────────────────

const COLS = 15;
const ROWS = 7;
const TOTAL_CELLS = COLS * ROWS; // 105 cells

/**
 * Build the activity grid.
 *
 * Strategy A — date-based (preferred): if `studiedDates` is a Set of
 *   "YYYY-MM-DD" strings, we map each cell to a calendar day going back
 *   TOTAL_CELLS days from today. Cell 0 = oldest day (top-left),
 *   last cell = today (bottom-right). Studied days get intensity 4.
 *
 * Strategy B — streak-count fallback: fill the FIRST `streak` cells
 *   (top-left → right) with intensity 4, rest with 0.
 *   This is correct for "old users" because a 1-day streak fills cell 0
 *   (top-left), not the last cell.
 */
/** Local YYYY-MM-DD string — avoids UTC-offset bugs */
function localDateStr(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function buildActivityGrid(
  streak: number,
  studiedDates?: Set<string>
): number[] {
  // Grid layout: bottom-right = Day 1 (most recent), fills right→left, bottom→top.
  // Array index 0 = top-left (oldest), last index = bottom-right (today).
  // So: index (TOTAL_CELLS - 1 - i) maps to "i days ago".
  if (studiedDates && studiedDates.size > 0) {
    const today = new Date();
    return Array.from({ length: TOTAL_CELLS }, (_, idx) => {
      // idx 0 = top-left = oldest. idx (TOTAL_CELLS-1) = bottom-right = today.
      const daysAgo = TOTAL_CELLS - 1 - idx;
      const d = new Date(today);
      d.setDate(today.getDate() - daysAgo);
      return studiedDates.has(localDateStr(d)) ? 4 : 0;
    });
  }

  // Strategy B: streak fills from bottom-right backwards.
  // The last `streak` cells (highest indices) are active.
  const clamp = Math.min(Math.max(streak, 0), TOTAL_CELLS);
  return Array.from({ length: TOTAL_CELLS }, (_, idx) =>
    idx >= TOTAL_CELLS - clamp ? 4 : 0
  );
}

const intensity = [
  "bg-muted",
  "bg-brand-green/25",
  "bg-brand-green/50",
  "bg-brand-green/75",
  "bg-brand-green",
];

// ─── Motivational copy ────────────────────────────────────────────────────────

function masteryMessage(pct: number): string {
  if (pct === 0) return "Plant your first seed — start reviewing! 🌱";
  if (pct < 20) return "You're just getting started. Every card counts!";
  if (pct < 50) return "Good progress! Keep the momentum going 💪";
  if (pct < 75) return "Over halfway there — you're crushing it 🔥";
  if (pct < 95) return "Almost a master! A few more sessions to go ⚡";
  return "Legendary memory! You've mastered everything 🏆";
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function Stats() {
  const { data: decks = [] } = useQuery({ queryKey: ["decks"], queryFn: getDecks });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  // Fetch server-side stats for all decks in parallel
  const { data: rawDeckStats = [] } = useQuery({
    queryKey: ["all-deck-stats", decks.map((d: any) => d.id)],
    queryFn: async () =>
      Promise.all(
        decks.map((deck: any) =>
          getDeckStats(deck.id).then((s) => computeFsrsStats(deck, s))
        )
      ),
    enabled: decks.length > 0,
  });

  // ── Aggregate totals ──────────────────────────────────────────────────────
  const { mastered, totalCards, totalDue, overallHealth, masteryPct } = useMemo(() => {
    const mastered = rawDeckStats.reduce((a, s) => a + s.mastered, 0);
    const totalCards = rawDeckStats.reduce((a, s) => a + s.total, 0);
    const totalDue = rawDeckStats.reduce((a, s) => a + s.due, 0);
    const overallHealth = totalCards > 0
      ? Math.round(((totalCards - totalDue) / totalCards) * 100)
      : 100;
    const masteryPct = totalCards > 0 ? Math.round((mastered / totalCards) * 100) : 0;
    return { mastered, totalCards, totalDue, overallHealth, masteryPct };
  }, [rawDeckStats]);

  const streak = profile?.current_streak ?? 0;

  // Build a Set of studied date strings from profile history if available.
  // Supports: profile.studied_dates (string[]) or profile.activity_log ({ date: string }[])
  // Falls back to streak-count mode (fills from top-left) for existing users.
  const studiedDates = useMemo<Set<string> | undefined>(() => {
    if (Array.isArray(profile?.studied_dates) && profile.studied_dates.length > 0) {
      return new Set<string>(profile.studied_dates as string[]);
    }
    if (Array.isArray(profile?.activity_log) && profile.activity_log.length > 0) {
      return new Set<string>(
        (profile.activity_log as { date: string }[]).map((e) => e.date.slice(0, 10))
      );
    }
    // Strategy B fallback: build a fake set of the last `streak` local dates
    if (streak > 0) {
      const today = new Date();
      const dates = new Set<string>();
      for (let i = 0; i < streak; i++) {
        const d = new Date(today);
        d.setDate(today.getDate() - i);
        dates.add(localDateStr(d));
      }
      return dates;
    }
    return undefined;
  }, [profile, streak]);

  const activity = buildActivityGrid(streak, studiedDates);

  // Health colour: green > 60, yellow 30–60, red < 30
  const healthColor =
    overallHealth >= 60 ? "bg-brand-green" :
      overallHealth >= 30 ? "bg-brand-yellow" :
        "bg-brand-red";

  return (
    <Layout>
      <PageHeader
        tag="Level-up screen"
        title="Brain Power Stats"
        subtitle="Your streak, memory score, mastered cards, and refresh meter — all in one place."
        icon={<Brain className="w-6 h-6" />}
      />

      <div className="grid lg:grid-cols-3 gap-6">

        {/* ── Brain Garden ── */}
        <SectionCard
          title="Brain Garden"
          subtitle="Your learning streak — keep it green!"
          icon={<Sprout className="w-5 h-5" />}
          color="green"
          className="lg:col-span-2"
          actions={
            <span className="pill bg-card flex items-center gap-1">
              <Flame className="w-3.5 h-3.5 text-brand-orange" />
              {streak} day streak
            </span>
          }
        >
          <div className="brutal-sm bg-card p-4">
            {/* top-left = today (i=0), filling right then down into the past */}
            <div
              className="grid gap-1.5"
              style={{ gridTemplateColumns: `repeat(${COLS}, 1fr)` }}
            >
              {activity.map((v, i) => {
                const daysAgo = TOTAL_CELLS - 1 - i;
                const label = daysAgo === 0 ? "Today" : daysAgo === 1 ? "Yesterday" : `${daysAgo} days ago`;
                return (
                <div
                  key={i}
                  title={label}
                  className={`aspect-square rounded-full border-2 border-border ${intensity[v]} hover:scale-125 transition-transform cursor-default`}
                />
                );
              })}
            </div>

            {/* Legend */}
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              Less
              {intensity.map((c, i) => (
                <div key={i} className={`w-3 h-3 rounded-full border-2 border-border ${c}`} />
              ))}
              More
            </div>

            {/* Streak milestone message */}
            {streak > 0 && (
              <p className="text-xs font-bold mt-2 text-brand-green">
                {streak >= 30 ? "🔥 On fire! 30+ day streak!" :
                  streak >= 7 ? "⚡ One week strong!" :
                    `Keep it up — ${7 - streak} days to your first week badge!`}
              </p>
            )}
          </div>
        </SectionCard>

        {/* ── Memory Mastery (FSRS-powered) ── */}
        <SectionCard
          title="Memory Mastery"
          icon={<Brain className="w-5 h-5" />}
          color="orange"
          className="lg:col-span-2"
        >
          {rawDeckStats.length > 0 ? (
            <div className="space-y-4">
              {/* Top row: big % + motivational message */}
              <div className="flex items-end gap-4">
                <div className="font-display text-7xl tabular-nums leading-none">{masteryPct}%</div>
                <div className="pb-1">
                  <p className="text-sm font-bold leading-snug">{masteryMessage(masteryPct)}</p>
                  <p className="text-[11px] text-muted-foreground mt-0.5">of your cards are locked in memory</p>
                </div>
              </div>

              {/* Segmented progress bar: mastered / learning / due */}
              {(() => {
                const learning = rawDeckStats.reduce((a, s) => a + Math.max(0, s.total - s.mastered - s.due), 0);
                const masteredPct = totalCards > 0 ? (mastered / totalCards) * 100 : 0;
                const learningPct = totalCards > 0 ? (learning / totalCards) * 100 : 0;
                const duePct = totalCards > 0 ? (totalDue / totalCards) * 100 : 0;
                return (
                  <div>
                    <div className="brutal-sm bg-muted h-5 overflow-hidden flex">
                      <div className="h-full bg-brand-green transition-all duration-700" style={{ width: `${masteredPct}%` }} title={`${mastered} mastered`} />
                      <div className="h-full bg-brand-blue transition-all duration-700" style={{ width: `${learningPct}%` }} title={`${learning} learning`} />
                      <div className="h-full bg-brand-orange/70 transition-all duration-700" style={{ width: `${duePct}%` }} title={`${totalDue} due`} />
                    </div>
                    <div className="flex gap-4 mt-2 text-[11px] font-bold">
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-green inline-block border border-border" /> {mastered} Mastered</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-blue inline-block border border-border" /> {learning} Learning</span>
                      <span className="flex items-center gap-1"><span className="w-2.5 h-2.5 rounded-full bg-brand-orange/70 inline-block border border-border" /> {totalDue} Due</span>
                    </div>
                  </div>
                );
              })()}

              {/* Per-deck mastery rows */}
              <div className="space-y-2 pt-1">
                {rawDeckStats.map((s) => {
                  const pct = s.total > 0 ? Math.round((s.mastered / s.total) * 100) : 0;
                  const label = pct >= 80 ? "🏆 Mastered" : pct >= 50 ? "💪 Halfway" : pct >= 20 ? "📈 Growing" : "🌱 Starting";
                  return (
                    <div key={s.deck.id} className="brutal-sm bg-card p-3">
                      <div className="flex justify-between items-center mb-1.5">
                        <span className="font-bold text-sm truncate max-w-[55%]">{s.deck.title}</span>
                        <span className="text-[11px] font-bold text-muted-foreground shrink-0">{label} · {pct}%</span>
                      </div>
                      <div className="brutal-sm bg-muted h-2.5 overflow-hidden">
                        <div
                          className="h-full bg-brand-green transition-all duration-700"
                          style={{ width: `${pct}%` }}
                        />
                      </div>
                      <div className="text-[10px] text-muted-foreground mt-1">{s.mastered} of {s.total} cards locked in</div>
                    </div>
                  );
                })}
              </div>

              <p className="text-[10px] text-muted-foreground opacity-70">⚙️ Mastered = stability &gt; 3 days (FSRS)</p>
            </div>
          ) : (
            <div className="text-muted-foreground h-full grid place-items-center min-h-[120px] text-sm">
              Upload a deck to see your stats.
            </div>
          )}
        </SectionCard>

        {/* ── Quick Stats column ── */}
        <div className="flex flex-col gap-6">
          {/* Locked In */}
          <SectionCard title="Locked In" icon={<Star className="w-5 h-5" />} color="yellow">
            <div className="font-display text-5xl tabular-nums">
              {mastered}
              <span className="text-2xl text-muted-foreground">/{totalCards}</span>
            </div>
            <div className="text-xs mt-1 flex items-center gap-1 text-muted-foreground">
              <TrendingUp className="w-3 h-3" /> 3+ day stability
            </div>
            {totalCards > 0 && (
              <div className="mt-3 brutal-sm bg-muted h-3 overflow-hidden">
                <div className="h-full bg-brand-yellow transition-all duration-700" style={{ width: `${(mastered / totalCards) * 100}%` }} />
              </div>
            )}
            {mastered > 0 && (
              <p className="text-[11px] font-bold text-brand-green mt-2">
                {mastered === totalCards ? "🏆 Full deck mastered!" : `${totalCards - mastered} more to go!`}
              </p>
            )}
          </SectionCard>

          {/* Due now */}
          <SectionCard title="Due Now" icon={<RotateCcw className="w-5 h-5" />} color="purple">
            <div className="font-display text-5xl tabular-nums">
              {totalDue}
              <span className="text-2xl text-muted-foreground"> cards</span>
            </div>
            <div className="text-xs mt-1 text-muted-foreground">waiting for review</div>
            {totalDue === 0 && totalCards > 0 && (
              <p className="text-[11px] font-bold text-brand-green mt-2">✅ All caught up!</p>
            )}
            {totalDue > 0 && (
              <p className="text-[11px] font-bold text-brand-orange mt-2">
                {totalDue > 20 ? "🔥 Big session ahead!" : "Quick review will clear these!"}
              </p>
            )}
          </SectionCard>
        </div>

        {/* ── Refresh Meter (Health) ── */}
        <SectionCard
          title="Refresh Meter"
          icon={<Gauge className="w-5 h-5" />}
          color="blue"
          className="lg:col-span-3"
          actions={
            <span className={`pill bg-card flex items-center gap-1 font-bold ${overallHealth >= 60 ? "text-brand-green" : overallHealth >= 30 ? "text-brand-yellow" : "text-brand-red"}`}>
              <Zap className="w-3.5 h-3.5" />
              {overallHealth}% fresh
            </span>
          }
        >
          <div className="space-y-4">
            {decks.length === 0 && (
              <div className="text-muted-foreground text-sm">No decks yet — add one to track health.</div>
            )}

            {rawDeckStats.length > 0 && (
              <>
                {/* Overall health summary */}
                <div className="brutal-sm bg-card p-4">
                  <div className="flex items-center justify-between mb-3">
                    <div>
                      <div className="font-bold text-sm">Overall Freshness</div>
                      <div className="text-[11px] text-muted-foreground mt-0.5">
                        {overallHealth >= 80 ? "Your memory is in great shape — keep it up!" :
                          overallHealth >= 60 ? "Looking good! A few cards need attention." :
                            overallHealth >= 30 ? "Some decks are getting stale — time to review." :
                              "⚠️ Cards are overdue — a review session will help a lot!"}
                      </div>
                    </div>
                    <div className={`font-display text-4xl tabular-nums ${overallHealth >= 60 ? "text-brand-green" : overallHealth >= 30 ? "text-brand-yellow" : "text-brand-red"}`}>
                      {overallHealth}%
                    </div>
                  </div>
                  <div className="brutal-sm bg-muted h-5 overflow-hidden">
                    <div className={`h-full transition-all duration-700 ${healthColor}`} style={{ width: `${overallHealth}%` }} />
                  </div>
                  {/* status icons row */}
                  <div className="flex gap-4 mt-3 text-[11px] font-bold">
                    <span className="flex items-center gap-1">
                      <CheckCircle2 className="w-3.5 h-3.5 text-brand-green" />
                      {totalCards - totalDue} fresh
                    </span>
                    <span className="flex items-center gap-1">
                      <AlertTriangle className="w-3.5 h-3.5 text-brand-orange" />
                      {totalDue} overdue
                    </span>
                    <span className="flex items-center gap-1">
                      <BookOpen className="w-3.5 h-3.5 text-brand-blue" />
                      {totalCards} total
                    </span>
                  </div>
                </div>

                {/* Per-deck health grid */}
                <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
                  {rawDeckStats.map((s) => {
                    const pct = s.health;
                    const barColor = pct >= 60 ? "bg-brand-green" : pct >= 30 ? "bg-brand-yellow" : "bg-brand-red";
                    const statusIcon = pct >= 60
                      ? <CheckCircle2 className="w-4 h-4 text-brand-green shrink-0" />
                      : pct >= 30
                        ? <Zap className="w-4 h-4 text-brand-yellow shrink-0" />
                        : <AlertTriangle className="w-4 h-4 text-brand-red shrink-0" />;
                    const tip = pct >= 80 ? "Excellent shape!" : pct >= 60 ? "Looking good" : pct >= 30 ? "Needs attention" : "Review now!";

                    return (
                      <div key={s.deck.id} className="brutal-sm bg-card p-3">
                        <div className="flex items-start gap-2 mb-2">
                          {statusIcon}
                          <div className="min-w-0">
                            <div className="font-bold text-sm truncate">{s.deck.title}</div>
                            <div className="text-[10px] text-muted-foreground">{tip} · {s.due} overdue</div>
                          </div>
                          <div className={`ml-auto font-display text-lg tabular-nums shrink-0 ${pct >= 60 ? "text-brand-green" : pct >= 30 ? "text-brand-yellow" : "text-brand-red"}`}>{pct}%</div>
                        </div>
                        <div className="brutal-sm bg-muted h-2.5 overflow-hidden">
                          <div className={`h-full transition-all duration-700 ${barColor}`} style={{ width: `${pct}%` }} />
                        </div>
                        <div className="text-[10px] text-muted-foreground mt-1.5">{s.mastered} locked in · {s.total} total</div>
                      </div>
                    );
                  })}
                </div>
              </>
            )}
          </div>
        </SectionCard>

      </div>
    </Layout>
  );
}