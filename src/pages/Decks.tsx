import Layout from "@/components/Layout";
import { PageHeader, SectionCard } from "@/components/Brutal";
import { BookMarked, Layers, Wrench, Download, Search, Zap, BookOpen, Sigma, Info, Trash2, FileText, ChevronDown } from "lucide-react";
import { useState } from "react";
import { useAppState } from "@/store/appState";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDecks, deleteDeck, getDeckCards } from "@/lib/api";
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
  const [formula, setFormula] = useState("E = mc^2");
  const [pdfDeckId, setPdfDeckId] = useState<string | null>(null);
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showPdfPicker, setShowPdfPicker] = useState(false);

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
