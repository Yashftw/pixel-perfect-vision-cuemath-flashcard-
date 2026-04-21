import Layout from "@/components/Layout";
import { PageHeader, SectionCard } from "@/components/Brutal";
import { Brain, Sprout, Flame, Lock, Gauge, TrendingUp } from "lucide-react";
import { useQuery } from "@tanstack/react-query";
import { getDecks, getDeckStats, getProfile } from "@/lib/api";

const intensity = ["bg-muted", "bg-brand-green/30", "bg-brand-green/55", "bg-brand-green/80", "bg-brand-green"];

export default function Stats() {
  const { data: decks = [] } = useQuery({ queryKey: ["decks"], queryFn: getDecks });
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile });

  const { data: deckStats = [] } = useQuery({
    queryKey: ["all-deck-stats", decks.map((d: any) => d.id)],
    queryFn: async () => {
      return Promise.all(decks.map((deck: any) => getDeckStats(deck.id).then(s => ({ ...s, deck }))));
    },
    enabled: decks.length > 0
  });

  const mastered = deckStats.reduce((a, s) => a + s.mastered, 0);
  const totalCards = Math.max(deckStats.reduce((a, s) => a + s.total, 0), 1);
  const totalDue = deckStats.reduce((a, s) => a + s.due, 0);
  const rusty = Math.round((totalDue / totalCards) * 100);

  const streak = profile?.current_streak || 0;

  // Build activity grid from streak — filled cells = streak days, rest empty
  const cols = 12, rows = 7, total = cols * rows;
  const activity = Array.from({ length: total }, (_, i) =>
    i >= total - streak ? 4 : 0
  );

  return (
    <Layout>
      <PageHeader
        tag="Level-up screen"
        title="Brain Power Stats"
        subtitle="Your streak, memory score, mastered cards, and refresh meter — all in one place."
        icon={<Brain className="w-6 h-6" />}
      />

      <div className="grid lg:grid-cols-3 gap-6">
        <SectionCard
          title="Brain Garden"
          subtitle="Your learning streak — keep it green!"
          icon={<Sprout className="w-5 h-5" />}
          color="green"
          className="lg:col-span-2"
          actions={<span className="pill bg-card"><Flame className="w-3.5 h-3.5 text-brand-orange" /> {streak} day streak</span>}
        >
          <div className="brutal-sm bg-card p-4">
            <div className="grid gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}>
              {activity.map((v, i) => (
                <div
                  key={i}
                  title={`Day ${i + 1}: ${v > 0 ? "studied" : "no activity"}`}
                  className={`aspect-square rounded-full border-2 border-border ${intensity[v]} hover:scale-125 transition-transform`}
                />
              ))}
            </div>
            <div className="flex items-center gap-2 mt-3 text-xs text-muted-foreground">
              Less
              {intensity.map((c, i) => <div key={i} className={`w-3 h-3 rounded-full border-2 border-border ${c}`} />)}
              More
            </div>
          </div>
        </SectionCard>

        <SectionCard title="Memory Mastery" icon={<Brain className="w-5 h-5" />} color="orange">
          {deckStats.length > 0 ? (
            <>
              <div className="font-display text-6xl">{Math.round((mastered / totalCards) * 100)}%</div>
              <div className="brutal-sm bg-card h-3 mt-4 overflow-hidden">
                <div className="h-full bg-brand-green transition-all" style={{ width: `${(mastered / totalCards) * 100}%` }} />
              </div>
              <p className="text-xs mt-3">Keep reviewing to lock them in! {mastered} fully mastered.</p>
            </>
          ) : (
            <div className="text-muted-foreground h-full grid place-items-center min-h-[120px]">Upload a deck first.</div>
          )}
        </SectionCard>

        <SectionCard title="Locked In" icon={<Lock className="w-5 h-5" />} color="yellow">
          <div className="font-display text-5xl">
            {mastered}<span className="text-2xl text-muted-foreground">/{totalCards === 1 ? 0 : totalCards}</span>
          </div>
          <div className="text-xs mt-2 flex items-center gap-1"><TrendingUp className="w-3 h-3" /> cards fully mastered</div>
        </SectionCard>

        <SectionCard
          title="Refresh Meter"
          icon={<Gauge className="w-5 h-5" />}
          color="blue"
          className="lg:col-span-2"
          actions={<span className="pill bg-card">{rusty}% getting rusty</span>}
        >
          <div className="space-y-3">
            {decks.length === 0 && (
              <div className="text-muted-foreground">No topics yet...</div>
            )}
            {deckStats.map((s: any) => {
              const deckRusty = s.total > 0 ? Math.round((s.due / s.total) * 100) : 0;
              return (
                <div key={s.deck.id} className="brutal-sm bg-card p-3">
                  <div className="flex justify-between text-sm font-bold mb-1.5">
                    <span>{s.deck.title}</span>
                    <span className="text-muted-foreground">{deckRusty}% due</span>
                  </div>
                  <div className="h-3 bg-muted rounded-full overflow-hidden border-2 border-border">
                    <div
                      className="h-full transition-all bg-brand-blue"
                      style={{ width: `${deckRusty}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </SectionCard>
      </div>
    </Layout>
  );
}