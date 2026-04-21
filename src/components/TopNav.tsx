import { NavLink, useLocation } from "react-router-dom";
import { Moon, Sun } from "lucide-react";
import { useAppState, applyDarkMode } from "@/store/appState";
import { useEffect } from "react";
import { useAuth } from "../hooks/useAuth";
import { getProfile } from "../lib/api";
import { useQuery } from "@tanstack/react-query";
import { playClick } from "@/lib/sounds";

const tabs = [
  { to: "/", label: "Home" },
  { to: "/decks", label: "Decks" },
  { to: "/stats", label: "Stats" },
  { to: "/profile", label: "Profile" },
];

export default function TopNav() {
  const [s, update] = useAppState();
  const loc = useLocation();
  const { user } = useAuth();
  const { data: profile } = useQuery({ queryKey: ["profile"], queryFn: getProfile, enabled: !!user });
  const avatar = profile?.avatar_url || null;
  const streak = profile?.current_streak || 0;

  useEffect(() => { applyDarkMode(s.prefs?.darkMode ?? false); }, [s?.prefs?.darkMode]);

  return (
    <header className="sticky top-0 z-40 bg-background/90 backdrop-blur border-b-2 border-border">
      <div className="container flex items-center justify-between py-3 gap-4">
        <NavLink to="/" className="flex items-center gap-3 group">
          <div className="brutal-sm bg-card w-11 h-11 grid place-items-center brutal-press p-0 overflow-hidden">
            <img src="/logo.jpeg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div className="leading-tight">
            <div className="font-display text-xl">Pixel Perfect Vision</div>
            <div className="text-xs text-muted-foreground -mt-0.5">Turn pages into play</div>
          </div>
        </NavLink>

        <nav className="hidden md:flex items-center gap-2">
          {tabs.map((t) => {
            const active = loc.pathname === t.to;
            return (
              <NavLink
                key={t.to}
                to={t.to}
                onClick={() => playClick()}
                className={`px-4 py-1.5 rounded-full font-bold text-sm transition-all ${
                  active
                    ? "bg-brand-yellow border-2 border-border shadow-[3px_3px_0_0_hsl(var(--border))]"
                    : "hover:bg-muted"
                }`}
              >
                {t.label}
              </NavLink>
            );
          })}
        </nav>

        <div className="flex items-center gap-2">
          {streak > 0 ? (
            <div className="pill bg-brand-orange text-foreground font-bold flex gap-1.5 items-center px-3 py-1.5">
              <span>🔥</span>
              <span>{streak} Streak</span>
            </div>
          ) : (
            <div className="pill bg-muted text-muted-foreground font-bold flex gap-1.5 items-center px-3 py-1.5 opacity-70">
              <span className="grayscale">🔥</span>
              <span>0 Streak</span>
            </div>
          )}
          <button
            onClick={() => { playClick(); update((st) => ({ prefs: { ...(st?.prefs || {}), darkMode: !(st?.prefs?.darkMode) } as any })); }}
            className="brutal-sm w-10 h-10 grid place-items-center bg-card brutal-press"
            aria-label="Toggle dark mode"
          >
            {s.prefs?.darkMode ? <Sun className="w-4 h-4" /> : <Moon className="w-4 h-4" />}
          </button>
          <div className="brutal-sm w-10 h-10 grid place-items-center bg-brand-purple font-bold text-sm overflow-hidden p-0 border-2">
            {avatar ? (
              <img src={avatar} alt="Profile Avatar" className="w-full h-full object-cover" />
            ) : user ? (
              <span className="text-xl font-bold text-white uppercase">{user.email?.charAt(0) || "U"}</span>
            ) : (
              <span className="text-xl font-bold text-white uppercase">?</span>
            )}
          </div>
        </div>
      </div>

      {/* mobile tabs */}
      <nav className="md:hidden container flex gap-2 pb-3 overflow-x-auto">
        {tabs.map((t) => {
          const active = loc.pathname === t.to;
          return (
            <NavLink
              key={t.to}
              to={t.to}
              onClick={() => playClick()}
              className={`px-4 py-1.5 rounded-full font-bold text-sm whitespace-nowrap ${
                active ? "bg-brand-yellow border-2 border-border shadow-[3px_3px_0_0_hsl(var(--border))]" : "bg-card border-2 border-border"
              }`}
            >
              {t.label}
            </NavLink>
          );
        })}
      </nav>
    </header>
  );
}
