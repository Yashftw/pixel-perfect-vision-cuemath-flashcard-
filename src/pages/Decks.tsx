import Layout from "@/components/Layout";
import { PageHeader, SectionCard } from "@/components/Brutal";
import { BookMarked, Layers, Wrench, Download, Search, Zap, BookOpen, Sigma, Info, Trash2, FileText, ChevronDown, X } from "lucide-react";
import { useState } from "react";
import { useAppState } from "@/store/appState";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDecks, deleteDeck, getDeckCards, generateMoreCards, askMathLooker } from "@/lib/api";
import jsPDF from "jspdf";
import { playClick } from "@/lib/sounds";

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
  const [formula, setFormula] = useState("");
  const [mathQuery, setMathQuery] = useState("");
  const [mathLoading, setMathLoading] = useState(false);
  const [pdfDeckId, setPdfDeckId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPdfPicker, setShowPdfPicker] = useState(false);

  const [selectedDeckId, setSelectedDeckId] = useState<string | null>(null);
  const [generatingMore, setGeneratingMore] = useState(false);

  const { data: decks = [], isLoading } = useQuery({ queryKey: ["decks"], queryFn: getDecks });

  const filtered = decks.filter((d: any) => d.title?.toLowerCase().includes(q.toLowerCase()));

  const exportPdf = async () => {
    const targetId = pdfDeckId || (decks[0] as any)?.id;
    if (!targetId) { toast.error("No deck selected."); return; }
    const deck = (decks as any[]).find((d) => d.id === targetId);
    setPdfLoading(true);
    try {
      const cards = await getDeckCards(targetId);
      if (!cards || cards.length === 0) { toast.error("This deck has no cards yet."); return; }

      const doc = new jsPDF({ unit: "pt", format: "a4" });
      const W = doc.internal.pageSize.getWidth();
      const H = doc.internal.pageSize.getHeight();
      const margin = 48;
      const contentW = W - margin * 2;

      // ── Cover page ──────────────────────────────────────────────────────────
      doc.setFillColor(255, 200, 100); // brand yellow
      doc.rect(0, 0, W, H, "F");
      // thick border
      doc.setDrawColor(30, 30, 40);
      doc.setLineWidth(4);
      doc.rect(12, 12, W - 24, H - 24);

      doc.setFont("helvetica", "bold");
      doc.setFontSize(36);
      doc.setTextColor(30, 30, 40);
      doc.text(deck?.title || "Study Deck", W / 2, H / 2 - 60, { align: "center", maxWidth: contentW });

      doc.setFontSize(14);
      doc.setFont("helvetica", "normal");
      doc.setTextColor(80, 80, 90);
      doc.text(deck?.subject || "General Study", W / 2, H / 2 - 20, { align: "center" });

      doc.setFontSize(11);
      doc.text(`${cards.length} cards  ·  Generated ${new Date().toLocaleDateString("en-US", { month: "long", day: "numeric", year: "numeric" })}`, W / 2, H / 2 + 14, { align: "center" });

      doc.setFontSize(10);
      doc.setTextColor(120, 120, 130);
      doc.text("BrainBlox — Take It With Me", W / 2, H - 40, { align: "center" });

      // ── Q&A pages ───────────────────────────────────────────────────────────
      const accentColors: [number, number, number][] = [
        [167, 230, 180], // green
        [255, 200, 100], // yellow
        [150, 200, 255], // blue
        [255, 160, 100], // orange
        [200, 170, 255], // purple
      ];

      cards.forEach((card: any, idx: number) => {
        doc.addPage();
        const accent = accentColors[idx % accentColors.length];

        // card number pill
        doc.setFillColor(...accent);
        doc.roundedRect(margin, 36, 60, 22, 6, 6, "F");
        doc.setDrawColor(30, 30, 40);
        doc.setLineWidth(1.5);
        doc.roundedRect(margin, 36, 60, 22, 6, 6, "S");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(10);
        doc.setTextColor(30, 30, 40);
        doc.text(`#${idx + 1}`, margin + 30, 51, { align: "center" });

        // deck name top-right
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(150, 150, 160);
        doc.text(deck?.title || "", W - margin, 51, { align: "right" });

        // divider
        doc.setDrawColor(30, 30, 40);
        doc.setLineWidth(1.5);
        doc.line(margin, 70, W - margin, 70);

        // QUESTION block
        doc.setFillColor(248, 248, 250);
        doc.setDrawColor(30, 30, 40);
        doc.setLineWidth(2);
        doc.roundedRect(margin, 84, contentW, 28, 4, 4, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(100, 100, 110);
        doc.text("QUESTION", margin + 10, 102);

        const qLines = doc.splitTextToSize(card.question || "", contentW - 20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(13);
        doc.setTextColor(30, 30, 40);
        doc.text(qLines, margin + 10, 132);

        const qBlockH = Math.max(60, qLines.length * 18 + 20);

        // ANSWER block
        const answerY = 84 + qBlockH + 20;
        doc.setFillColor(...accent);
        doc.setDrawColor(30, 30, 40);
        doc.setLineWidth(2);
        doc.roundedRect(margin, answerY, contentW, 28, 4, 4, "FD");
        doc.setFont("helvetica", "bold");
        doc.setFontSize(9);
        doc.setTextColor(30, 30, 40);
        doc.text("ANSWER", margin + 10, answerY + 18);

        const aLines = doc.splitTextToSize(card.answer || "", contentW - 20);
        doc.setFont("helvetica", "normal");
        doc.setFontSize(13);
        doc.setTextColor(30, 30, 40);
        doc.text(aLines, margin + 10, answerY + 46);

        // hint (if present)
        if (card.hint) {
          const hintY = answerY + 46 + aLines.length * 18 + 16;
          doc.setFont("helvetica", "italic");
          doc.setFontSize(10);
          doc.setTextColor(130, 130, 145);
          const hLines = doc.splitTextToSize(`💡 ${card.hint}`, contentW - 20);
          doc.text(hLines, margin + 10, hintY);
        }

        // page footer
        doc.setFont("helvetica", "normal");
        doc.setFontSize(9);
        doc.setTextColor(180, 180, 190);
        doc.text(`${idx + 1} / ${cards.length}`, W / 2, H - 28, { align: "center" });
        doc.setDrawColor(200, 200, 210);
        doc.setLineWidth(0.5);
        doc.line(margin, H - 38, W - margin, H - 38);
      });

      doc.save(`${deck?.title || "deck"}.pdf`);
      toast.success(`PDF saved — ${cards.length} cards exported!`);
      setShowPdfPicker(false);
    } catch (e: any) {
      toast.error("PDF export failed: " + e.message);
    } finally {
      setPdfLoading(false);
    }
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
    playClick();
    setSelectedDeckId(id);
  };

  const handleStudyPrevious = () => {
    if (!selectedDeckId) return;
    playClick();
    update(() => ({ currentDeckId: selectedDeckId, currentCardIndex: 0 }));
    navigate(`/study/${selectedDeckId}`);
  };

  const handleNewGeneration = async () => {
    if (!selectedDeckId) return;
    playClick();
    const deck = decks.find((d: any) => d.id === selectedDeckId);
    if (!deck) return;
    setGeneratingMore(true);
    try {
      const toastId = toast.loading("Generating new cards...", { id: 'gen' });
      await generateMoreCards(deck.id, deck.subject, (msg) => {
        toast.loading(msg, { id: toastId });
      });
      toast.success("New cards ready!", { id: toastId });
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      queryClient.invalidateQueries({ queryKey: ["all-cards", deck.id] });
      update(() => ({ currentDeckId: deck.id, currentCardIndex: 0 }));
      navigate(`/study/${deck.id}`);
    } catch (err: any) {
      toast.error("Failed: " + err.message, { id: 'gen' });
    } finally {
      setGeneratingMore(false);
      setSelectedDeckId(null);
    }
  };

  const askMath = async () => {
    if (!mathQuery.trim()) return;
    setMathLoading(true);
    playClick();
    try {
      const res = await askMathLooker(mathQuery);
      setFormula(res);
      setMathQuery("");
    } catch (err: any) {
      toast.error("Math Looker failed: " + err.message);
    } finally {
      setMathLoading(false);
    }
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
                onClick={() => { setFixIt((v) => !v); playClick(); toast(fixIt ? "Fix-it mode off" : "Fix-it mode on — tap a deck to delete"); }}
                className={`brutal-sm brutal-press px-3 py-1.5 font-bold text-xs flex items-center gap-1.5 ${fixIt ? "bg-brand-red" : "bg-brand-yellow"}`}
              ><Wrench className="w-3.5 h-3.5" /> FIX-IT MODE</button>
              <div className="relative">
                <button
                  onClick={() => setShowPdfPicker((v) => !v)}
                  className="brutal-sm brutal-press bg-brand-blue px-3 py-1.5 font-bold text-xs flex items-center gap-1.5"
                >
                  <FileText className="w-3.5 h-3.5" /> TAKE IT WITH ME
                  <ChevronDown className="w-3 h-3" />
                </button>
                {showPdfPicker && (
                  <div className="absolute right-0 top-full mt-1 z-50 brutal-sm bg-card min-w-[200px] p-2 flex flex-col gap-1">
                    <div className="text-[10px] font-bold text-muted-foreground uppercase px-2 pb-1">Pick a deck</div>
                    {(decks as any[]).map((d) => (
                      <button
                        key={d.id}
                        onClick={() => setPdfDeckId(d.id)}
                        className={`text-left px-3 py-2 text-sm font-bold brutal-sm brutal-press ${pdfDeckId === d.id ? "bg-brand-blue" : "bg-muted hover:bg-brand-blue/30"}`}
                      >
                        {d.title}
                      </button>
                    ))}
                    <button
                      onClick={exportPdf}
                      disabled={pdfLoading || !pdfDeckId}
                      className="mt-1 brutal-sm brutal-press bg-brand-green px-3 py-2 font-bold text-xs flex items-center justify-center gap-1.5 disabled:opacity-60"
                    >
                      <Download className="w-3.5 h-3.5" />
                      {pdfLoading ? "Generating..." : "Download PDF"}
                    </button>
                  </div>
                )}
              </div>
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
              )
            })}
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

              <div className="flex gap-2 mb-3">
                <input
                  value={mathQuery} onChange={(e) => setMathQuery(e.target.value)}
                  onKeyDown={(e) => { if (e.key === 'Enter') askMath(); }}
                  placeholder="e.g. pythagoras theorem, area of a circle..."
                  className="brutal-sm bg-card px-3 py-2 flex-1 text-sm outline-none"
                  disabled={mathLoading}
                />
                <button
                  onClick={askMath}
                  disabled={mathLoading || !mathQuery.trim()}
                  className="brutal-sm bg-brand-orange px-3 font-bold text-xs disabled:opacity-50"
                >
                  {mathLoading ? "..." : "SEARCH"}
                </button>
              </div>

              {formula ? (
                <div className="brutal-sm bg-card px-3 py-4 text-center font-display text-xl min-h-[60px] flex items-center justify-center animate-fade-in relative group">
                  <div className="absolute top-1 right-1 opacity-0 group-hover:opacity-100 transition-opacity">
                    <button
                      onClick={() => { navigator.clipboard.writeText(formula); toast.success("Copied formula to clipboard!"); }}
                      className="text-[10px] bg-muted px-2 py-1 brutal-sm hover:bg-brand-blue"
                    >
                      COPY LaTeX
                    </button>
                  </div>
                  {renderMath(formula)}
                </div>
              ) : (
                <div className="brutal-sm bg-card/50 px-3 py-6 text-center text-sm text-muted-foreground min-h-[60px] flex flex-col items-center justify-center border-dashed border-2 border-border">
                  <Sigma className="w-6 h-6 mb-2 opacity-20" />
                  Search for a math equation above
                </div>
              )}
            </div>
          </div>

          <div className="brutal-sm bg-brand-blue/40 p-4 mt-4 flex gap-3 items-start">
            <Info className="w-5 h-5 shrink-0 mt-0.5" />
            <div className="text-xs leading-relaxed">
              <div className="font-bold mb-1">How to use Smart Settings</div>
              <p><b>Turbo:</b> Pick this when you want quick cards from short notes.</p>
              <p><b>Deep Dive:</b> Pick this for big chapters or tricky topics — it takes a little longer but catches more.</p>
              <p><b>Math Looker:</b> Ask for any formula and it will show you the exact math equation. You can copy the LaTeX to use in your cards.</p>
            </div>
          </div>
        </SectionCard>
      </div>

      {selectedDeckId && !generatingMore && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="brutal bg-card w-full max-w-md p-6 space-y-5 animate-fade-in relative">
            <button onClick={() => setSelectedDeckId(null)} className="absolute top-4 right-4 p-1 hover:bg-muted brutal-sm"><X className="w-4 h-4" /></button>
            <div className="text-center mt-2">
              <div className="font-display text-2xl mb-1">Study Time</div>
              <p className="text-sm text-muted-foreground">What would you like to do?</p>
            </div>

            <div className="space-y-3">
              <button
                onClick={handleStudyPrevious}
                className="w-full brutal-sm brutal-press bg-brand-blue p-4 text-left transition-all hover:-translate-y-1"
              >
                <div className="font-bold text-base flex items-center gap-2"><BookOpen className="w-5 h-5" /> Previous Questions</div>
                <div className="text-xs text-muted-foreground mt-1 text-black/70">Study the cards you've already generated and build mastery.</div>
              </button>

              <button
                onClick={handleNewGeneration}
                className="w-full brutal-sm brutal-press bg-brand-orange p-4 text-left transition-all hover:-translate-y-1"
              >
                <div className="font-bold text-base flex items-center gap-2"><Zap className="w-5 h-5" /> New Generation</div>
                <div className="text-xs text-muted-foreground mt-1 text-black/70">AI will generate a fresh batch of 30 new cards for this subject.</div>
              </button>
            </div>
          </div>
        </div>
      )}

      {generatingMore && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="brutal bg-card p-8 text-center space-y-4 animate-pulse">
            <Zap className="w-8 h-8 mx-auto text-brand-orange animate-bounce" />
            <div className="font-display text-xl">Generating New Cards...</div>
            <div className="text-sm text-muted-foreground">This takes about 30-60 seconds.</div>
          </div>
        </div>
      )}

    </Layout>
  );
}
