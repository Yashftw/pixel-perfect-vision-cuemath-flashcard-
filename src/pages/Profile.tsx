import Layout from "@/components/Layout";
import { PageHeader, SectionCard } from "@/components/Brutal";
import { User, Star, Flame, Calendar, Trophy, Camera, Bell, Clock, Moon, Volume2, LogOut, Hash, Wand2, Zap, Award, Lock, Trash2 } from "lucide-react";
import { useRef, useState, useEffect } from "react";
import { useAppState } from "@/store/appState";
import { toast } from "sonner";
import { useAuth } from "../hooks/useAuth";
import { getProfile, updateProfile, uploadAvatar } from "../lib/api";
import { supabase } from "../lib/supabase";

const badgeColor: Record<string, string> = {
  yellow: "bg-brand-yellow", green: "bg-brand-green", blue: "bg-brand-blue",
  purple: "bg-brand-purple", orange: "bg-brand-orange", red: "bg-brand-red"
};

const iconFor = (name: string) => {
  if (name.includes("Streak")) return Flame;
  if (name.includes("Cards")) return Hash;
  if (name.includes("Math")) return Wand2;
  if (name.includes("Speed")) return Zap;
  if (name.includes("Deck")) return Star;
  return Award;
};

const BADGE_DEFS = [
  { id: "First Step 🌱", desc: "Upload your first PDF deck", color: "green" },
  { id: "Card Shark 🃏", desc: "Answer 10 flashcards", color: "yellow" },
  { id: "Century Club 💯", desc: "Answer 100 flashcards", color: "purple" },
  { id: "On Fire 🔥", desc: "Achieve a 3-day streak", color: "orange" },
  { id: "Week Warrior ⚔️", desc: "Study 7 days in a row", color: "blue" },
  { id: "Month Master 📅", desc: "Study 30 days in a row", color: "blue" },
  { id: "Math Wizard 🧙", desc: "Master a card from a Math deck", color: "purple" },
  { id: "Memory Machine 🤖", desc: "Master 10 cards", color: "green" },
  { id: "Collector 📚", desc: "Create 5 decks", color: "blue" },
  { id: "Speed Demon ⚡", desc: "Rate 5 cards as Easy in one session", color: "yellow" },
  { id: "Comeback Kid 💪", desc: "Study after a streak break", color: "orange" },
  { id: "Brain Garden 🌿", desc: "Cards due across 3 subjects", color: "green" }
];

export default function Profile() {
  const [s, update] = useAppState();
  const { user, signOut } = useAuth();
  
  const [profile, setProfile] = useState<any>(null);
  const [name, setName] = useState("");
  const fileRef = useRef<HTMLInputElement>(null);
  const [badges, setBadges] = useState<any[]>([]);
  const [uploading, setUploading] = useState(false);
  const [stats, setStats] = useState({ mastered: 0, totalReps: 0 });

  useEffect(() => {
    if (user) {
      getProfile().then(p => {
        if (p) {
          setProfile(p);
          setName(p.display_name || user.email?.split('@')[0] || "Explorer");
        }
      });
      supabase.from("user_badges").select("*").eq("user_id", user.id).then(({ data }) => setBadges(data || []));
      
      supabase.from("cards").select("id, card_states(reps, stability)").eq("card_states.user_id", user.id).then(({ data }) => {
          let r = 0; let m = 0;
          data?.forEach(c => {
             const st = c.card_states?.[0];
             if (st) { r += (st.reps||0); if (st.stability>21) m++; }
          });
          setStats({ mastered: m, totalReps: r });
      });
    }
  }, [user]);

  const handleAvatar = async (file: File) => {
    if (!file.type.startsWith("image/")) return toast.error("Please pick an image file");
    if (file.size > 3 * 1024 * 1024) return toast.error("Image too big (max 3MB)");
    
    try {
      setUploading(true);
      toast.loading("Uploading avatar...", { id: 'av' });
      const url = await uploadAvatar(file);
      setProfile((prev: any) => ({ ...prev, avatar_url: url }));
      toast.success("New profile picture saved!", { id: 'av' });
    } catch (err: any) {
      toast.error(err.message, { id: 'av' });
    } finally {
      setUploading(false);
    }
  };

  const removeAvatar = async () => {
    try {
      await updateProfile({ avatar_url: null });
      setProfile((prev: any) => ({ ...prev, avatar_url: null }));
      toast("Profile picture removed");
    } catch (err: any) {
      toast.error("Failed to remove: " + err.message);
    }
  };

  return (
    <Layout>
      <PageHeader
        tag="Your account"
        title="Profile"
        subtitle="Your stats, badges, and preferences live here."
        icon={<User className="w-6 h-6" />}
      />

      <div className="grid gap-6">
        <div className="brutal bg-brand-orange p-5 flex flex-wrap items-center gap-4">
          <div className="relative">
            <div className="brutal-sm bg-card w-20 h-20 grid place-items-center font-display text-2xl overflow-hidden p-0 border-2">
              {profile?.avatar_url ? (
                <img src={profile.avatar_url} alt="Profile" className="w-full h-full object-cover" />
              ) : (
                user?.email?.charAt(0).toUpperCase() || "U"
              )}
            </div>
            <button
              onClick={() => fileRef.current?.click()}
              className="absolute -bottom-1 -right-1 brutal-sm bg-card w-7 h-7 grid place-items-center brutal-press"
              aria-label="Change profile picture"
            >
              <Camera className="w-3.5 h-3.5" />
            </button>
            <input
              ref={fileRef} type="file" accept="image/*" hidden
              onChange={(e) => { const f = e.target.files?.[0]; if (f) handleAvatar(f); e.target.value = ""; }}
            />
          </div>
          <div className="flex-1 min-w-[200px]">
            <div className="font-display text-2xl">{name || "..."}</div>
            <div className="text-sm">{user?.email}</div>
            <div className="flex flex-wrap gap-2 mt-2">
              <span className="pill bg-card"><Flame className="w-3 h-3" /> {profile?.current_streak || 0}-day streak</span>
              <span className="pill bg-card"><Calendar className="w-3 h-3" /> Best: {profile?.best_streak || 0}</span>
            </div>
          </div>
          <div className="flex flex-col gap-2">
            <button
              onClick={() => fileRef.current?.click()}
              disabled={uploading}
              className="brutal-sm brutal-press bg-card px-4 py-2 font-bold text-sm flex items-center gap-2"
            ><Camera className="w-4 h-4" /> {uploading ? 'UPLOADING...' : 'CHANGE PHOTO'}</button>
            {profile?.avatar_url && (
              <button
                onClick={removeAvatar}
                className="brutal-sm brutal-press bg-card px-4 py-2 font-bold text-xs flex items-center gap-2"
              ><Trash2 className="w-3.5 h-3.5" /> Remove</button>
            )}
          </div>
        </div>

        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          {[
            { v: stats.totalReps.toLocaleString(), l: "Total Cards Answered", c: "bg-brand-green", I: Hash },
            { v: `${profile?.best_streak || 0}d`, l: "Best Streak", c: "bg-brand-yellow", I: Flame },
            { v: `${badges.length}/${BADGE_DEFS.length}`, l: "Badges", c: "bg-brand-blue", I: Trophy },
            { v: stats.mastered.toLocaleString(), l: "Cards Mastered", c: "bg-brand-purple", I: Award },
          ].map((k) => (
            <div key={k.l} className={`brutal ${k.c} p-4`}>
              <div className="brutal-sm bg-card w-9 h-9 grid place-items-center mb-2">
                <k.I className="w-4 h-4" />
              </div>
              <div className="font-display text-2xl">{k.v}</div>
              <div className="text-xs">{k.l}</div>
            </div>
          ))}
        </div>

        <SectionCard title="Badge Collection" subtitle="Earn badges by studying, streaking, and mastering cards." icon={<Trophy className="w-5 h-5" />}>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
            {BADGE_DEFS.map((b) => {
              const Icon = iconFor(b.id);
              const unlocked = badges.find(ub => ub.badge_id === b.id);
              return (
                <div
                  key={b.id}
                  className={`brutal-sm brutal-press p-3 text-center ${badgeColor[b.color]} ${!unlocked ? "grayscale opacity-60" : ""}`}
                >
                  <div className="brutal-sm bg-card w-10 h-10 grid place-items-center mx-auto mb-2 relative">
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="font-bold text-xs">{b.id}</div>
                  <div className="text-[10px] my-1 opacity-80 leading-tight">{b.desc}</div>
                  {!unlocked && <div className="text-[10px] text-card-foreground mt-0.5 flex items-center justify-center gap-1"><Lock className="w-2.5 h-2.5" /> Locked</div>}
                  {unlocked && <div className="text-[9px] text-card-foreground mt-1 bg-background/20 inline-block px-1 rounded">Unlocked</div>}
                </div>
              );
            })}
          </div>
        </SectionCard>

        <div className="grid lg:grid-cols-2 gap-6">
          <SectionCard title="Account Info">
            <label className="text-xs font-bold">Display Name</label>
            <input
              value={name} onChange={(e) => setName(e.target.value)}
              className="brutal-sm bg-card px-3 py-2 w-full text-sm mb-3 mt-1 outline-none font-bold"
            />
            <label className="text-xs font-bold">Email</label>
            <input
              value={user?.email || ""} readOnly disabled
              className="brutal-sm bg-muted text-muted-foreground px-3 py-2 w-full text-sm mb-4 mt-1 outline-none pointer-events-none"
            />
            <button
              onClick={async () => {
                toast.loading("Saving...", { id: 'sv' });
                try {
                  await updateProfile({ display_name: name });
                  toast.success("Saved!", { id: 'sv' });
                } catch(e: any) {
                  toast.error("Failed to save: " + e.message, { id: 'sv' });
                }
              }}
              className="brutal-sm brutal-press bg-brand-orange px-4 py-2 font-bold text-sm"
            >SAVE CHANGES</button>
          </SectionCard>

          <SectionCard title="Preferences">
            <div className="space-y-3">
              <Toggle
                label="Daily Study Reminder" icon={<Bell className="w-4 h-4" />} color="bg-brand-yellow"
                checked={s.prefs.reminder}
                onChange={(v) => update((st) => ({ prefs: { ...st.prefs, reminder: v } }))}
              />
              {s.prefs.reminder && (
                <div className="brutal-sm bg-muted px-3 py-2 flex items-center gap-2 animate-fade-in">
                  <Clock className="w-4 h-4" />
                  <span className="text-sm flex-1">Remind me at</span>
                  <input
                    type="time" value={s.prefs.reminderAt}
                    onChange={(e) => update((st) => ({ prefs: { ...st.prefs, reminderAt: e.target.value } }))}
                    className="brutal-sm bg-card px-2 py-1 text-sm outline-none"
                  />
                </div>
              )}
              <Toggle
                label="Dark Mode" icon={<Moon className="w-4 h-4" />} color="bg-brand-blue"
                checked={s.prefs.darkMode}
                onChange={(v) => update((st) => ({ prefs: { ...st.prefs, darkMode: v } }))}
              />
              <Toggle
                label="Sound Effects" icon={<Volume2 className="w-4 h-4" />} color="bg-brand-green"
                checked={s.prefs.sound}
                onChange={(v) => update((st) => ({ prefs: { ...st.prefs, sound: v } }))}
              />
              <button
                onClick={async () => {
                  toast("Signing out...");
                  await signOut();
                }}
                className="brutal-sm brutal-press bg-brand-red text-foreground w-full px-4 py-2 font-bold text-sm flex items-center justify-center gap-2"
              ><LogOut className="w-4 h-4" /> LOG OUT</button>
            </div>
          </SectionCard>
        </div>
      </div>
    </Layout>
  );
}

function Toggle({ label, icon, color, checked, onChange }: {
  label: string; icon: React.ReactNode; color: string; checked: boolean; onChange: (v: boolean) => void;
}) {
  return (
    <div className={`brutal-sm ${color} px-3 py-2 flex items-center gap-3`}>
      <div className="brutal-sm bg-card w-7 h-7 grid place-items-center">{icon}</div>
      <span className="font-bold text-sm flex-1">{label}</span>
      <button
        onClick={() => onChange(!checked)}
        className={`brutal-sm w-12 h-7 rounded-full relative transition-colors ${checked ? "bg-brand-green" : "bg-card"}`}
        aria-pressed={checked}
      >
        <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-card border-2 border-border transition-all ${checked ? "left-[26px]" : "left-0.5"}`} />
      </button>
    </div>
  );
}
