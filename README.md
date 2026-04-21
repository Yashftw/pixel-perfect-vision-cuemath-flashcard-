# Pixel Perfect Vision

Deployed link : https://pixel-perfect-vision-cuemath-flashc-opal.vercel.app/

**Turn pages into play.**

A spaced-repetition flashcard application that converts any PDF into a smart, practice-ready deck of cards. Upload a chapter, get cards written like a great teacher made them, then let the scheduling engine decide what you need to see next — and when.

Built with React, TypeScript, Vite, Supabase, and a custom implementation of the FSRS memory scheduling algorithm.

---

<!-- Screenshot: Home page showing the Magic Uploader / Brain Box with a PDF being dropped in -->

---

## Table of Contents

- [Overview](#overview)
- [Features](#features)
- [Tech Stack](#tech-stack)
- [Project Structure](#project-structure)
- [Prerequisites](#prerequisites)
- [Getting Started](#getting-started)
- [Environment Variables](#environment-variables)
- [Supabase Setup](#supabase-setup)
- [Edge Functions](#edge-functions)
- [How It Works](#how-it-works)
- [Pages and Routes](#pages-and-routes)
- [Available Scripts](#available-scripts)

---

## Overview

Most students re-read their notes and hope it sticks. It does not. Pixel Perfect Vision is built around the two techniques that actually build long-term memory: spaced repetition and active recall.

A student drops in any PDF — a textbook chapter, a worksheet, class notes — and the app generates up to 30 cards using an AI edge function. Cards are not shallow summaries. The generation pipeline is tuned to surface key concepts, definitions, relationships, edge cases, and worked examples. Two ingestion modes let the student control how the AI interprets the material.

After generation, a custom FSRS scheduler tracks every card individually. Cards you know well fade into the background. Cards you struggle with keep returning until they are locked in. Progress is tracked across a streak calendar, a memory mastery score, and a per-deck freshness meter.

---

## Features

**Card Generation**
- PDF upload with AI-generated flashcards (default 30, configurable)
- Word-for-Word mode — preserves original language, ideal for definitions and exact terminology
- Easy Explain mode — AI simplifies the content, better for dense or complex chapters
- Turbo study speed — fast cards from short notes
- Deep Dive study speed — thorough extraction for long chapters or tricky topics
- Magic Math renderer — type any formula in plain text and preview how it renders on the card before saving

**Study Engine**
- FSRS-based spaced repetition scheduling (custom implementation in `src/lib/fsrs.ts`)
- Difficulty picker before each session: Chill (10 cards), Standard (20), Beast (all), Custom (slider)
- Typed answer checking with instant feedback
- Due cards are prioritised; non-due cards fill remaining slots
- Summary screen after each session with option to reshuffle and go again

**Progress Tracking**
- Brain Garden — a GitHub-style activity grid (15 x 7 cells); bottom-right is today, fills right to left and bottom to top
- Memory Mastery panel — percentage of cards with stability above 21 days, segmented bar per deck (mastered / learning / due), milestone labels
- Refresh Meter — per-deck freshness score; green above 60%, yellow 30–60%, red below 30%
- Daily study streak with best-streak tracking

**Deck Management**
- Card Collection browser with search across all cards
- Fix-It Mode to edit any card the AI generated incorrectly
- Take It With Me — PDF export of any deck's full Q&A via jsPDF

**Gamification**
- Badge collection with 14 badges across study habits, streaks, mastery, and subject milestones
- XP system
- Daily study reminder with configurable time

**Other**
- Dark mode toggle
- Synthesised click and feedback sound effects via Web Audio API — no external audio files
- Google OAuth and magic link login via Supabase Auth

---

<!-- Screenshot: Active study session showing a card, the difficulty rating buttons, and the typed answer input -->

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend framework | React 18 + TypeScript |
| Build tool | Vite 5 |
| Styling | Tailwind CSS 3 + custom neobrutalism design system |
| Component primitives | Radix UI |
| State and data fetching | TanStack React Query v5 |
| Routing | React Router v6 |
| Backend / database | Supabase (Postgres + Auth + Storage + Edge Functions) |
| Memory scheduling | FSRS algorithm — custom implementation in `src/lib/fsrs.ts` |
| PDF export | jsPDF |
| Charts | Recharts |
| Testing | Vitest + Testing Library |

---

## Project Structure

```
pixel-perfect-vision-main/
├── public/
│   └── logo.jpeg
├── src/
│   ├── components/
│   │   ├── ui/               # Radix-based shadcn components
│   │   ├── AuthGuard.tsx
│   │   ├── Brutal.tsx        # PageHeader and SectionCard layout components
│   │   ├── Layout.tsx
│   │   ├── NavLink.tsx
│   │   └── TopNav.tsx
│   ├── hooks/
│   │   ├── use-mobile.tsx
│   │   ├── use-toast.ts
│   │   └── useAuth.ts
│   ├── lib/
│   │   ├── api.ts            # All Supabase data access functions
│   │   ├── auth.ts
│   │   ├── fsrs.ts           # FSRS spaced repetition algorithm
│   │   ├── sounds.ts         # Web Audio API sound synthesis
│   │   ├── supabase.ts       # Supabase client initialisation
│   │   └── utils.ts
│   ├── pages/
│   │   ├── Decks.tsx         # Deck browser, Fix-It Mode, PDF export
│   │   ├── Index.tsx         # Home page and PDF uploader
│   │   ├── LoginPage.tsx
│   │   ├── NotFound.tsx
│   │   ├── Profile.tsx
│   │   ├── Stats.tsx         # Brain Garden, Memory Mastery, Refresh Meter
│   │   └── StudyPage.tsx     # Active flashcard study session
│   ├── store/
│   │   └── appState.ts       # localStorage-backed app preferences
│   └── test/
│       ├── example.test.ts
│       └── setup.ts
├── supabase/
│   └── functions/
│       ├── generate-cards/   # Edge function: PDF to flashcards via AI
│       └── review-card/      # Edge function: FSRS review submission
├── .env.example
├── components.json
├── index.html
├── package.json
├── tailwind.config.ts
└── vite.config.ts
```

---

## Prerequisites

- Node.js 18 or later
- npm 9 or later
- A Supabase project (free tier is sufficient)
- Supabase CLI (for deploying edge functions)

---

## Getting Started

**1. Clone the repository**

```bash
git clone <your-repo-url>
cd pixel-perfect-vision-main
```

**2. Install dependencies**

```bash
npm install
```

**3. Set up environment variables**

```bash
cp .env.example .env
```

Fill in the values as described in [Environment Variables](#environment-variables).

**4. Set up your Supabase database**

Create the tables described in [Supabase Setup](#supabase-setup) and deploy the edge functions as described in [Edge Functions](#edge-functions).

**5. Start the development server**

```bash
npm run dev
```

The app will be available at `http://localhost:5173`.

---

## Environment Variables

Create a `.env` file in the project root with the following keys:

```env
VITE_SUPABASE_URL=https://your-project-ref.supabase.co
VITE_SUPABASE_ANON_KEY=your-anon-key
VITE_GOOGLE_CLIENT_ID=your-google-oauth-client-id
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
```

| Variable | Description |
|---|---|
| `VITE_SUPABASE_URL` | Your Supabase project URL — found in Project Settings > API |
| `VITE_SUPABASE_ANON_KEY` | Public anon key for client-side Supabase access |
| `VITE_GOOGLE_CLIENT_ID` | Google OAuth client ID for social login |
| `SUPABASE_SERVICE_ROLE_KEY` | Service role key used only by edge functions — keep this secret |

Variables prefixed with `VITE_` are bundled into the client. Never place the service role key in a `VITE_` variable.

---

## Supabase Setup

The following tables are required in your Supabase Postgres database. Enable Row Level Security on all tables and add policies so each user can only read and write their own rows.

### `profiles`

Extends the built-in `auth.users` table.

| Column | Type | Notes |
|---|---|---|
| id | uuid | References `auth.users.id` |
| display_name | text | |
| avatar_url | text | |
| current_streak | int | Days studied consecutively |
| best_streak | int | |
| last_study_date | date | YYYY-MM-DD |
| comeback_triggered | bool | Set when user returns after a streak break |
| studied_dates | text[] | Array of YYYY-MM-DD strings powering the activity grid |

### `decks`

| Column | Type |
|---|---|
| id | uuid |
| user_id | uuid |
| title | text |
| subject | text |
| pdf_url | text (nullable) |
| created_at | timestamptz |

### `cards`

| Column | Type |
|---|---|
| id | uuid |
| deck_id | uuid |
| question | text |
| answer | text |
| hint | text |
| order_index | int |

### `card_states`

One row per card per user. Updated by the `review-card` edge function after every review.

| Column | Type | Notes |
|---|---|---|
| card_id | uuid | |
| user_id | uuid | |
| stability | float | FSRS stability value in days |
| difficulty | float | |
| reps | int | Total number of reviews |
| lapses | int | Number of times the card was forgotten |
| state | text | `new`, `learning`, `review`, or `relearning` |
| due_date | timestamptz | Next scheduled review |
| last_review | timestamptz | |

### `user_badges`

| Column | Type |
|---|---|
| user_id | uuid |
| badge_id | text |
| earned_at | timestamptz |

### `study_logs`

| Column | Type |
|---|---|
| user_id | uuid |
| study_date | date |
| cards_reviewed | int |

---

<!-- Screenshot: Stats page showing the Brain Garden activity grid, Memory Mastery panel, and Refresh Meter -->

---

## Edge Functions

Two Supabase Edge Functions handle server-side logic. Both are located in `supabase/functions/`.

### `generate-cards`

Receives a PDF as base64, calls an AI model to extract and generate flashcards, then inserts the resulting cards into the `cards` table.

**Request body**

```json
{
  "deckId": "uuid",
  "pdfBase64": "base64-encoded-pdf",
  "subject": "string",
  "userId": "uuid",
  "cardCount": 30
}
```

**Response**

```json
{
  "cardCount": 30
}
```

### `review-card`

Runs the FSRS algorithm for a given card and rating, then updates the corresponding `card_states` row with the new stability, difficulty, and due date.

**Request body**

```json
{
  "cardId": "uuid",
  "userId": "uuid",
  "rating": 1
}
```

Rating values: `1` = Forgot, `2` = Hard, `3` = Got it, `4` = Too Easy.

### Deploying edge functions

```bash
supabase login
supabase link --project-ref your-project-ref
supabase functions deploy generate-cards
supabase functions deploy review-card
```

---

## How It Works

### Card generation

1. The student selects a card count and an ingestion mode (Word-for-Word or Easy Explain) on the home page, then drops in a PDF.
2. The PDF is converted to base64 in the browser and posted to the `generate-cards` edge function along with the chosen mode and study speed.
3. The edge function extracts content from the PDF, calls an AI model with a structured prompt tuned for educational card quality, and writes the resulting cards to the database.
4. On success the student is redirected directly into the study session for that deck.

### Spaced repetition (FSRS)

Each card carries a stability score measured in days. After every review, the `review-card` edge function feeds the student's rating into the FSRS algorithm and recalculates the card's stability, difficulty, and next `due_date`. Cards with stability above 21 days are considered mastered and counted as Locked In.

The full algorithm lives in `src/lib/fsrs.ts`. The edge function calls it server-side to prevent client-side manipulation of scheduling data.

### Study session flow

1. A difficulty picker modal appears before each session.
2. Due cards are loaded first. Non-due cards fill remaining slots up to the chosen count.
3. The student reads each card, optionally types an answer for instant feedback, then rates their recall from 1 to 4.
4. Each rating is posted to `review-card` in the background. The scheduler updates immediately.
5. After the final card, a summary screen shows session performance and offers a fresh reshuffle.

### Brain Garden

The activity grid is 15 columns by 7 rows (105 cells). The bottom-right cell represents today. Each day studied is highlighted in green. Cells fill from right to left and bottom to top as the study history grows.

### Memory Mastery

Displayed on the Stats page. Shows the percentage of cards with stability above 21 days, a three-segment bar (mastered, learning, due) across the full card collection, and per-deck progress rows with milestone labels.

### Refresh Meter

Shows what percentage of cards across the collection are not currently overdue, broken down per deck. Colour coded: green above 60%, yellow between 30% and 60%, red below 30%. A deck at 0% getting rusty means every card in it is past its due date.

---

<!-- Screenshot: Decks page showing the Card Collection with two decks, Fix-It Mode button, and Smart Settings panel with Math Looker -->

---

## Pages and Routes

| Route | Page | Description |
|---|---|---|
| `/` | Index | Home dashboard and Magic Uploader |
| `/decks` | Decks | Browse decks, edit cards, export PDF, configure Smart Settings |
| `/study/:deckId` | StudyPage | Active flashcard study session |
| `/stats` | Stats | Brain Garden, Memory Mastery, Refresh Meter |
| `/profile` | Profile | User profile, badge collection, preferences |
| `/login` | LoginPage | Magic link and Google OAuth login |
| `/auth/callback` | AuthCallback | Supabase auth redirect handler |

---

<!-- Screenshot: Profile page showing the badge collection with locked and unlocked badges visible -->

---

## Available Scripts

| Script | Description |
|---|---|
| `npm run dev` | Start the Vite development server at `localhost:5173` |
| `npm run build` | Production build output to `dist/` |
| `npm run build:dev` | Development build with source maps |
| `npm run preview` | Serve the production build locally |
| `npm run lint` | Run ESLint across the project |
| `npm run test` | Run the Vitest test suite once |
| `npm run test:watch` | Run Vitest in watch mode |

---

## Key Design Decisions

**Why FSRS over SM-2 or Leitner boxes**

FSRS (Free Spaced Repetition Scheduler) models memory stability and retrievability more accurately than SM-2 for varied review intervals and is better suited to short decks where the card pool is small enough that a box-based system would stall. The algorithm is implemented entirely in `src/lib/fsrs.ts` and runs server-side via the `review-card` edge function.

**Why two ingestion modes**

A single prompt cannot optimally handle both a two-page chemistry worksheet and a fifteen-page history chapter. Word-for-Word preserves terminology precisely. Easy Explain rewrites for comprehension. Letting the student choose removes a layer of friction and improves card quality for both use cases.

**Why synthesised sounds instead of audio files**

The Web Audio API lets the app generate click and feedback sounds programmatically with no external files and no network requests. This keeps the bundle lean and eliminates a class of loading failures on slow connections.

**Why neobrutalism for the visual design**

Flashcard apps are notoriously dull. A distinct visual system with strong colour, thick borders, and clear hierarchy makes the app memorable and gives the gamification elements — badges, streaks, the Brain Garden — room to feel meaningful rather than decorative.

---

*Built by Yashraj Yadav — 22BET10063*
