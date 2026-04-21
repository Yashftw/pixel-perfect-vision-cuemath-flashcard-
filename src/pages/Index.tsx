import Layout from "@/components/Layout";
import { PageHeader, SectionCard } from "@/components/Brutal";
import { Home as HomeIcon, BarChart3, Plus, Upload, Wand2, BookOpen, Lightbulb, Calculator, CheckCircle2, Star, Timer, X, Frown, Check, Rocket, RotateCcw } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useAppState } from "@/store/appState";
import { toast } from "sonner";
import { useNavigate } from "react-router-dom";
import confetti from "canvas-confetti";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { getDecks, getDueCards, uploadPDFAndGenerateCards, submitReview, getProfile, updateProfile, uploadAvatar } from "@/lib/api";
import { useAuth } from "../hooks/useAuth";

const STEPS = [
  { label: "Reading", icon: BookOpen },
  { label: "Finding Big Ideas", icon: Lightbulb },
  { label: "Writing Math", icon: Calculator },
  { label: "Almost Ready", icon: CheckCircle2 },
];

export default function Index() {
  const [s, update] = useAppState();
  const { user } = useAuth();
  const displayName = user?.email?.split('@')[0] || "Explorer";
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const fileRef = useRef<HTMLInputElement>(null);
  
  const [mode, setMode] = useState<"word" | "easy">("easy");
  const [step, setStep] = useState(-1);
  const [dragOver, setDragOver] = useState(false);
  const [uploadStatus, setUploadStatus] = useState<string>("");

  const { data: profile } = useQuery({ 
      queryKey: ["profile"], 
      queryFn: getProfile,
      enabled: !!user
  });
  const [showWelcome, setShowWelcome] = useState(false);
  const [welcomeName, setWelcomeName] = useState("");
  const fileRefModal = useRef<HTMLInputElement>(null);

  useEffect(() => {
      // If the user's display_name hasn't been set intentionally, show the modal on first login
      if (profile && !profile.display_name && !localStorage.getItem("welcomeSeen")) {
          setShowWelcome(true);
      }
  }, [profile]);

  const completeWelcome = async () => {
      if (welcomeName) await updateProfile({ display_name: welcomeName });
      localStorage.setItem("welcomeSeen", "true");
      setShowWelcome(false);
  };

  const uploadMutation = useMutation({
    mutationFn: async (file: File) => {
      setStep(0);
      let i = 0;
      const tick = setInterval(() => {
        i++;
        setStep(i >= STEPS.length ? i - 1 : i);
      }, 3000);

      try {
        const result = await uploadPDFAndGenerateCards(file, file.name.replace('.pdf', ''), setUploadStatus);
        clearInterval(tick);
        setStep(STEPS.length);
        return result;
      } catch (err) {
        clearInterval(tick);
        throw err;
      }
    },
    onSuccess: (data) => {
      toast.success(`Deck ready! Let's study 🚀`);
      queryClient.invalidateQueries({ queryKey: ["decks"] });
      // Redirect seamlessly without lingering on the dashboard
      navigate(`/study/${data.deck.id}`);
    },
    onError: (err: any) => {
      toast.error(`Error: ${err.message}`);
      setStep(-1);
    }
  });

  const handleFile = (file: File) => {
    toast(`Got "${file.name}"! Brewing your deck…`);
    uploadMutation.mutate(file);
  };



  return (
    <Layout>
      <PageHeader
        tag={`Welcome back, ${displayName}`}
        title="Ready to level up your brain today?"
        subtitle="Upload a worksheet, smash some cards, and watch your Brain Garden grow."
        icon={<HomeIcon className="w-6 h-6" />}
        actions={
          <>
            <button onClick={() => navigate("/stats")} className="brutal-sm brutal-press bg-card px-4 py-2 font-bold text-sm flex items-center gap-2">
              <BarChart3 className="w-4 h-4" /> SEE STATS
            </button>
            <button onClick={() => fileRef.current?.click()} className="brutal-sm brutal-press bg-brand-orange px-4 py-2 font-bold text-sm flex items-center gap-2">
              <Plus className="w-4 h-4" /> NEW DECK
            </button>
          </>
        }
      />

      <div className="grid gap-6">
        <SectionCard
          title="Magic Uploader"
          subtitle="Drop your school PDF here to turn it into a game!"
          icon={<Wand2 className="w-5 h-5" />}
          color="card"
          actions={
            <div className="brutal-sm flex bg-card overflow-hidden">
              <button
                onClick={() => setMode("word")}
                className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 ${mode === "word" ? "bg-brand-yellow" : ""}`}
              ><BookOpen className="w-3 h-3" /> Word-for-Word</button>
              <button
                onClick={() => setMode("easy")}
                className={`px-3 py-1.5 text-xs font-bold flex items-center gap-1 border-l-2 border-border ${mode === "easy" ? "bg-brand-green" : ""}`}
              ><Lightbulb className="w-3 h-3" /> Easy Explain</button>
            </div>
          }
        >
          {uploadMutation.isError ? (
            <div className="brutal-sm bg-brand-red/10 p-8 text-center">
              <div className="brutal-sm bg-brand-red w-16 h-16 grid place-items-center mx-auto mb-3 text-white">
                <Frown className="w-7 h-7" />
              </div>
              <div className="font-display text-lg text-brand-red">Oops try again</div>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 mb-4">
                oops make sure to try again
              </p>
              <button
                onClick={() => { uploadMutation.reset(); setUploadStatus(""); fileRef.current?.click(); }}
                className="brutal-sm brutal-press bg-brand-orange px-5 py-2 font-bold text-sm"
              >
                TRY AGAIN
              </button>
              <input
                ref={fileRef} type="file" accept=".pdf" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
            </div>
          ) : (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => {
                e.preventDefault(); setDragOver(false);
                const f = e.dataTransfer.files?.[0]; if (f) handleFile(f);
              }}
              className={`brutal-sm bg-muted p-8 text-center transition-all ${dragOver ? "animate-wiggle bg-brand-yellow" : ""}`}
              style={{ opacity: uploadMutation.isPending ? 0.6 : 1, pointerEvents: uploadMutation.isPending ? 'none' : 'auto' }}
            >
              <div className="brutal-sm bg-brand-orange w-16 h-16 grid place-items-center mx-auto mb-3 animate-float">
                <Upload className="w-7 h-7" />
              </div>
              <div className="font-display text-lg">{uploadStatus || "The Brain Box"}</div>
              <p className="text-xs text-muted-foreground max-w-xs mx-auto mt-1 mb-4">
                Drop your school PDF here to turn it into a game! (Please be patient, AI generation can take ~60 seconds)
              </p>
              <button onClick={() => fileRef.current?.click()} className="brutal-sm brutal-press bg-brand-orange px-5 py-2 font-bold text-sm">
                PICK A FILE
              </button>
              <input
                ref={fileRef} type="file" accept=".pdf" hidden
                onChange={(e) => { const f = e.target.files?.[0]; if (f) handleFile(f); e.target.value = ''; }}
              />
            </div>
          )}

          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
            {STEPS.map((st, i) => {
              const Icon = st.icon;
              const active = step >= i;
              const done = step > i;
              const label = i === STEPS.length - 1 && active && !done ? "Ready!" : `${st.label}${active && !done ? "..." : ""}`;
              return (
                <div
                  key={st.label}
                  className={`brutal-sm px-3 py-2.5 flex items-center gap-2 text-sm font-bold transition-all ${
                    done ? "bg-brand-green" : active ? "bg-brand-yellow animate-pop" : "bg-card"
                  }`}
                >
                  <Icon className="w-4 h-4" /> {label}
                </div>
              );
            })}
          </div>
        </SectionCard>

      </div>

      {showWelcome && (
        <div className="fixed inset-0 z-50 bg-background/80 backdrop-blur-sm grid place-items-center p-4">
          <div className="brutal bg-card max-w-sm w-full p-6 animate-pop">
            <h2 className="font-display text-2xl mb-2 text-center">Welcome to BrainBlox!</h2>
            <p className="text-sm text-center mb-6">Let's set up your profile before you start studying.</p>
            
            <div className="space-y-4">
              <div>
                <label className="text-xs font-bold">What should we call you?</label>
                <input
                  value={welcomeName} onChange={(e) => setWelcomeName(e.target.value)}
                  placeholder={displayName}
                  className="brutal-sm bg-muted px-3 py-2 w-full text-sm mt-1 outline-none"
                />
              </div>
              <div className="grid place-items-center mb-2">
                <div className="relative">
                  <div className="brutal-sm bg-brand-orange w-24 h-24 grid place-items-center font-display text-3xl overflow-hidden p-0">
                    {profile?.avatar_url ? (
                      <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
                    ) : (
                      user?.email?.charAt(0).toUpperCase() || "?"
                    )}
                  </div>
                </div>
                <button
                  onClick={() => fileRefModal.current?.click()}
                  className="mt-3 text-xs font-bold underline text-brand-blue"
                >Upload Profile Picture</button>
                <input
                  ref={fileRefModal} type="file" accept="image/*" hidden
                  onChange={async (e) => { 
                    const f = e.target.files?.[0]; 
                    if (f) {
                      try {
                          toast.loading("Uploading...", { id: 'wm' });
                          const url = await uploadAvatar(f);
                          queryClient.invalidateQueries({ queryKey: ["profile"] });
                          toast.success("Picture added!", { id: 'wm' });
                      } catch (err: any) {
                          toast.error(err.message, { id: 'wm' });
                      }
                    } 
                  }}
                />
              </div>
            </div>
            
            <button
              onClick={completeWelcome}
              className="mt-6 w-full brutal-sm brutal-press bg-brand-green px-4 py-3 font-bold"
            >LET'S GO 🚀</button>
            <button
              onClick={() => setShowWelcome(false)}
              className="mt-2 w-full text-xs text-muted-foreground underline"
            >Skip for now</button>
          </div>
        </div>
      )}
    </Layout>
  );
}
