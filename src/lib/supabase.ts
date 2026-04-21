import { createClient } from '@supabase/supabase-js'

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
    throw new Error('Missing Supabase environment variables')
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY)

// Types matching your schema
export interface Deck {
    id: string
    user_id: string
    title: string
    subject: string | null
    pdf_url: string | null
    card_count: number
    created_at: string
}

export interface Card {
    id: string
    deck_id: string
    question: string
    answer: string
    hint: string | null
    concept_cluster: string | null
    order_index: number | null
    created_at: string
}

export interface CardState {
    id: string
    card_id: string
    user_id: string
    stability: number
    difficulty: number
    reps: number
    lapses: number
    state: 'new' | 'learning' | 'review' | 'relearning'
    due_date: string
    last_review: string | null
}

export interface CardWithState extends Card {
    card_states: CardState[]
}