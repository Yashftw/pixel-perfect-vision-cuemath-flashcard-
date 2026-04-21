import { useEffect, useState } from "react";

export type Deck = {
  id: string;
  name: string;
  count: number;
  color: "green" | "yellow" | "blue" | "orange" | "purple";
};

export type Card = {
  id: string;
  deckId: string;
  question: string;
  answer: string;
  clue: string;
  mastered: boolean;
};

export type AppState = {
  user: { name: string; email: string; initials: string; level: number; joined: string; avatar?: string };
  xp: number;
  streak: number;
  bestStreak: number;
  mastered: number;
  totalCards: number;
  studySpeed: "turbo" | "deep";
  prefs: { reminder: boolean; reminderAt: string; darkMode: boolean; sound: boolean };
  badges: { id: string; name: string; icon: string; color: string; unlocked: boolean }[];
  decks: Deck[];
  cards: Card[];
  activity: number[]; // 84 days, value 0-4
  refreshTopics: { name: string; pct: number }[];
  currentDeckId: string;
  currentCardIndex: number;
};

const KEY = "pixel-perfect-state-v1";

const seed: AppState = {
  user: { name: "", email: "", initials: "", level: 1, joined: new Date().toLocaleDateString('en-US', { month: 'short', year: 'numeric' }), avatar: undefined },
  xp: 0,
  streak: 0,
  bestStreak: 0,
  mastered: 0,
  totalCards: 0,
  studySpeed: "turbo",
  prefs: { reminder: true, reminderAt: "17:00", darkMode: false, sound: true },
  badges: [],
  decks: [],
  cards: [],
  activity: Array.from({ length: 84 }, () => 0),
  refreshTopics: [],
  currentDeckId: "",
  currentCardIndex: 0,
};

let listeners: Array<() => void> = [];
let state: AppState = load();

function load(): AppState {
  try {
    const raw = localStorage.getItem(KEY);
    if (raw) return { ...seed, ...JSON.parse(raw) };
  } catch {}
  return seed;
}

function save() {
  try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
  listeners.forEach((l) => l());
}

export function useAppState(): [AppState, (updater: (s: AppState) => Partial<AppState> | void) => void] {
  const [, setTick] = useState(0);
  useEffect(() => {
    const l = () => setTick((t) => t + 1);
    listeners.push(l);
    return () => { listeners = listeners.filter((x) => x !== l); };
  }, []);
  const update = (updater: (s: AppState) => Partial<AppState> | void) => {
    const patch = updater(state);
    if (patch) state = { ...state, ...patch };
    save();
  };
  return [state, update];
}

export function applyDarkMode(on: boolean) {
  document.documentElement.classList.toggle("dark", on);
}
