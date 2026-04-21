import Layout from "@/components/Layout";
import { PageHeader, SectionCard } from "@/components/Brutal";
import { BookMarked, Layers, Wrench, Download, Search, Zap, BookOpen, Sigma, Info, Plus, Trash2 } from "lucide-react";
import { useState } from "react";
import { useAppState } from "@/store/appState";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDecks, deleteDeck, createDeck } from "@/lib/api";

const colorMap: Record<string, string> = {
  green: "bg-brand-green", yellow: "bg-brand-yellow", blue: "bg-brand-blue",
  orange: "bg-brand-orange", purple: "bg-brand-purple",
};

export default function Decks() {
  const [s, update] = useAppState();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [q, setQ] = useState("");
  const [fixIt, setFixIt] = useState(false);
  const [formula, setFormula] = useState("E = mc^2");

  const { data: decks = [], isLoading } = useQuery({ queryKey: ["decks"], queryFn: getDecks });

  const filtered = decks.filter((d: any) => d.title?.toLowerCase().includes(q.toLowerCase()));

  const exportDecks = () => {
    const blob = new Blob([JSON.stringify(decks, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = "pixel-perfect-decks.json"; a.click();
    URL.revokeObjectURL(url);
    toast.success("Deck collection exported!");
  };

  const deleteMutation = useMutation({
    mutationFn: deleteDeck,
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      toast.success("Deck deleted.");
    }
  });

  const removeDeck = (id: string) => {
    deleteMutation.mutate(id);
  };

  const openDeck = (id: string) => {
    update(() => ({ currentDeckId: id, currentCardIndex: 0 }));
    navigate(`/study/${id}`);
  };

  // tiny math renderer (handles ^ as superscript)
  const renderMath = (f: string) => {
    const parts = f.split(/(\^[^ +\-*/=]+)/g);
    return parts.map((p, i) => p.startsWith("^") ? <sup key={i}>{p.slice(1)}</sup> : <span key={i}>{p}</span>);
  };

  return (
    <Layout>
      <PageHeader
        tag="Your card stash"
        title="Decks & Settings"
        subtitle="Browse your card collection and tweak how new decks get made."
        icon={<BookMarked className="w-6 h-6" />}
      />

      <div className="grid gap-6">
        <SectionCard
          title="Card Collection"
          subtitle="Your stash of study cards."
          icon={<Layers className="w-5 h-5" />}
          actions={
            <>
              <button
                onClick={() => { setFixIt((v) => !v); toast(fixIt ? "Fix-it mode off" : "Fix-it mode on — tap a deck to delete"); }}
                className={`brutal-sm brutal-press px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 ${fixIt ? "bg-brand-red" : "bg-brand-yellow"}`}
              ><Wrench className="w-3.5 h-3.5" /> FIX-IT MODE</button>
              <button onClick={exportDecks} className="brutal-sm brutal-press bg-brand-blue px-3 py-1.5 font-bold text-xs flex items-center gap-1.5">
                <Download className="w-3.5 h-3.5" /> TAKE IT WITH ME
              </button>
            </>
          }
        >
          <div className="brutal-sm bg-card flex items-center px-3 py-2 mb-4">
            <Search className="w-4 h-4 mr-2 text-muted-foreground" />
            <input
              value={q} onChange={(e) => setQ(e.target.value)}
              placeholder="Find a Card..."
              className="bg-transparent flex-1 text-sm outline-none"
            />
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4">
            {isLoading ? (
               <div className="col-span-full p-4 text-center text-muted-foreground">Loading your decks...</div>
            ) : filtered.length === 0 ? (
               <div className="col-span-full p-4 text-center text-muted-foreground">No decks yet. Go to Home to upload a PDF!</div>
            ) : null}
            {filtered.map((d: any, i) => {
              const bgColors = ["green", "yellow", "blue", "orange", "purple"];
              const colorKey = bgColors[i % bgColors.length];
              return (
              <button
                key={d.id}
                onClick={() => fixIt ? removeDeck(d.id) : openDeck(d.id)}
                className={`brutal-sm brutal-press p-4 text-left ${colorMap[colorKey]} group relative`}
              >
                <div className="brutal-sm bg-card w-9 h-9 grid place-items-center mb-3">
                  {fixIt ? <Trash2 className="w-4 h-4" /> : <BookOpen className="w-4 h-4" />}
                </div>
                <div className="font-display text-base leading-tight">{d.title}</div>
                <div className="text-xs text-muted-foreground mt-1">{d.subject || "General Study"}</div>
              </button>
            )})}
          </div>
        </SectionCard>

        <SectionCard
          title="Smart Settings"
          subtitle="Pick a study speed and preview your math."
          icon={<Sigma className="w-5 h-5" />}
        >
          <div className="grid md:grid-cols-2 gap-4">
            <div className="brutal-sm bg-muted p-4">
              <div className="text-xs font-bold text-muted-foreground mb-3">Study Speed</div>
              <div className="grid grid-cols-2 gap-3">
                {([
                  { id: "turbo", label: "Turbo", desc: "Fast & simple", icon: Zap, color: "bg-brand-yellow" },
                  { id: "deep", label: "Deep Dive", desc: "Finds tricky stuff", icon: BookOpen, color: "bg-card" },
                ] as const).map((opt) => {
                  const Icon = opt.icon;
                  const active = s.studySpeed === opt.id;
                  return (
                    <button
                      key={opt.id}
                      onClick={() => { update(() => ({ studySpeed: opt.id })); toast.success(`Switched to ${opt.label}`); }}
                      className={`brutal-sm brutal-press p-3 text-left ${active ? opt.color : "bg-card"}`}
                    >
                      <Icon className="w-4 h-4 mb-1" />
                      <div className="font-bold text-sm">{opt.label}</div>
                      <div className="text-[11px] text-muted-foreground">{opt.desc}</div>
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="brutal-sm bg-muted p-4">
              <div className="text-xs font-bold text-muted-foreground mb-3 flex items-center gap-1.5"><Sigma className="w-3.5 h-3.5" /> Math Looker</div>
              <input
                value={formula} onChange={(e) => setFormula(e.target.value)}
                className="brutal-sm bg-card px-3 py-2 w-full text-sm font-mono mb-2 outline-none"
              />
              <div className="brutal-sm bg-card px-3 py-4 text-center font-display text-xl">
                {renderMath(formula)}
              </div>
            </div>
          </div>

          <div className="brutal-sm bg-brand-blue/40 p-4 mt-4 flex gap-3 items-start">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-bold mb-1">How to use Smart Settings</div>
              <p><b>Turbo:</b> Pick this when you want quick cards from short notes.</p>
              <p><b>Deep Dive:</b> Pick this for big chapters or tricky topics — it takes a little longer but catches more.</p>
              <p><b>Math Looker:</b> Type any math formula and see how it will appear on your card before you save it.</p>
            </div>
          </div>
        </SectionCard>
      </div>
    </Layout>
  );
}
