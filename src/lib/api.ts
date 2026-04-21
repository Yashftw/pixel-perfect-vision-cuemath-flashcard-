import { supabase } from './supabase'

// ─── AUTH ────────────────────────────────────────────────
export async function signInWithEmail(email: string) {
    const { error } = await supabase.auth.signInWithOtp({
        email,
        options: { emailRedirectTo: window.location.origin }
    })
    if (error) throw error
}

export async function signOut() {
    await supabase.auth.signOut()
}

export async function getCurrentUser() {
    const { data: { session } } = await supabase.auth.getSession()
    return session?.user ?? null
}

// ─── PROFILE ─────────────────────────────────────────────
export async function getProfile() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null

    const { data, error } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', session.user.id)
        .maybeSingle()
    if (error) throw error
    return data
}

export async function updateProfile(updates: any) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return null

    const { error } = await supabase
        .from('profiles')
        .update(updates)
        .eq('id', session.user.id)
    if (error) throw error
}

export async function uploadAvatar(file: File) {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error("No user")

    const fileExt = file.name.split('.').pop()
    const filePath = `${session.user.id}/avatar.${fileExt}`

    const { error: uploadError } = await supabase.storage
        .from('avatars')
        .upload(filePath, file, { upsert: true })

    if (uploadError) throw uploadError

    const { data: { publicUrl } } = supabase.storage
        .from('avatars')
        .getPublicUrl(filePath)

    await updateProfile({ avatar_url: `${publicUrl}?t=${Date.now()}` }) // Cache bust
    return publicUrl
}

// ─── DECKS ───────────────────────────────────────────────
export async function getDecks() {
    const { data, error } = await supabase
        .from('decks')
        .select('*')
        .order('created_at', { ascending: false })

    if (error) throw error
    return data
}

export async function createDeck(title: string, subject: string) {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id || "00000000-0000-0000-0000-000000000000"

    const { data, error } = await supabase
        .from('decks')
        .insert({ title, subject, user_id: userId })
        .select()
        .single()

    if (error) throw error
    return data
}

export async function deleteDeck(deckId: string) {
    const { error } = await supabase
        .from('decks')
        .delete()
        .eq('id', deckId)

    if (error) throw error
}

// ─── PDF UPLOAD + CARD GENERATION ────────────────────────
export async function uploadPDFAndGenerateCards(
    file: File,
    subject: string,
    onStatus: (msg: string) => void,
    cardCount: number = 15
) {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id || "00000000-0000-0000-0000-000000000000"

    // 1. Convert PDF to base64
    onStatus('Reading PDF...')
    const base64 = await fileToBase64(file)

    // 3. Create deck record
    onStatus('Creating deck...')
    const { data: deck, error: deckError } = await supabase
        .from('decks')
        .insert({
            user_id: userId,
            title: file.name.replace('.pdf', ''),
            subject,
            pdf_url: null
        })
        .select()
        .single()

    if (deckError) throw deckError

    // 4. Call edge function to generate cards
    onStatus('AI is reading your PDF and generating cards... (30-60 seconds)')
    try {
        const { data, error: fnError } = await supabase.functions.invoke('generate-cards', {
            body: {
                deckId: deck.id,
                pdfBase64: base64,
                subject,
                userId: userId,
                cardCount
            }
        })

        if (fnError) {
            let msg = fnError.message;
            if (fnError.context && fnError.context.status) {
                msg = `Gateway Error ${fnError.context.status}: ${fnError.message}`;
            }
            throw new Error(msg);
        }
        if (data.error) throw new Error(data.error)

        onStatus(`Done! Generated ${data.cardCount} cards.`)
        return { deck, cardCount: data.cardCount }
    } catch (err) {
        await supabase.from('decks').delete().eq('id', deck.id);
        throw err;
    }
}

// ─── CARDS ───────────────────────────────────────────────
export async function getDeckCards(deckId: string) {
    const { data, error } = await supabase
        .from('cards')
        .select('*')
        .eq('deck_id', deckId)
        .order('order_index', { ascending: true })

    if (error) throw error
    return data
}

export async function getDueCards(deckId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id || "00000000-0000-0000-0000-000000000000"

    // Get all cards in deck with their states
    const { data, error } = await supabase
        .from('cards')
        .select(`
      *,
      card_states (*)
    `)
        .eq('deck_id', deckId)
        .order('order_index', { ascending: true })

    if (error) throw error

    // Filter to due cards (due_date <= now) or new cards
    const now = new Date()
    return data.filter(card => {
        const state = card.card_states?.[0]
        if (!state) return true // new card, always show
        return new Date(state.due_date) <= now
    })
}

export async function getAllCards(deckId: string) {
    const { data, error } = await supabase
        .from('cards')
        .select(`*, card_states(*)`)
        .eq('deck_id', deckId)
        .order('order_index', { ascending: true })

    if (error) throw error
    return data
}

// ─── REVIEW ──────────────────────────────────────────────
export async function submitReview(
    cardId: string,
    rating: 1 | 2 | 3 | 4
) {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id || "00000000-0000-0000-0000-000000000000"

    const { data, error } = await supabase.functions.invoke('review-card', {
        body: { cardId, userId, rating }
    })

    if (error) throw error
    if (data.error) throw new Error(data.error)

    // Run gamification loops silently
    void assessStreak().then(() => evaluateBadges())

    return data
}

// ─── GAMIFICATION ────────────────────────────────────────
export async function assessStreak() {
    const profile = await getProfile();
    if (!profile) return;

    const todayStr = new Date().toLocaleDateString('en-CA'); // YYYY-MM-DD local time
    const lastStr = profile.last_study_date;

    let current = profile.current_streak || 0;
    let best = profile.best_streak || 0;
    let comebackTriggered = profile.comeback_triggered || false;

    if (!lastStr) {
        current = 1;
    } else if (lastStr !== todayStr) {
        const lastDate = new Date(lastStr);
        const todayDate = new Date(todayStr);
        const diffTime = Math.abs(todayDate.getTime() - lastDate.getTime());
        const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

        if (diffDays === 1) {
            current += 1;
        } else {
            if (current > 1) {
                comebackTriggered = true;
            }
            current = 1;
        }
    } else {
        return; // already studied today
    }

    if (current > best) best = current;

    await updateProfile({
        current_streak: current,
        best_streak: best,
        last_study_date: todayStr,
        comeback_triggered: comebackTriggered
    });
}

export async function evaluateBadges() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    const { data: existing } = await supabase.from('user_badges').select('badge_id').eq('user_id', session.user.id);
    const existingIds = new Set(existing?.map(b => b.badge_id) || []);

    const grant = async (badgeId: string) => {
        if (!existingIds.has(badgeId)) {
            const { error } = await supabase.from('user_badges').insert({ user_id: session?.user?.id, badge_id: badgeId });
            if (!error) existingIds.add(badgeId);
        }
    }

    const { data: profile } = await supabase.from('profiles').select('*').eq('id', session.user.id).single();
    if (profile) {
        if (profile.current_streak >= 3) await grant('On Fire 🔥');
        if (profile.best_streak >= 7) await grant('Week Warrior ⚔️');
        if (profile.best_streak >= 30) await grant('Month Master 📅');
        if (profile.comeback_triggered) await grant('Comeback Kid 💪');
    }

    const { data: decks } = await supabase.from('decks').select('id, subject').eq('user_id', session.user.id);
    if (decks) {
        if (decks.length >= 1) await grant('First Step 🌱');
        if (decks.length >= 5) await grant('Collector 📚');

        const deckIds = decks.map(d => d.id);
        if (deckIds.length > 0) {
            const { data: cards } = await supabase.from('cards').select(`id, deck_id, card_states(*)`).in('deck_id', deckIds);
            let totalReps = 0;
            let masteredCount = 0;
            let mathMastered = false;
            const dueSubjects = new Set();
            const now = new Date();

            cards?.forEach(card => {
                const state = card.card_states?.[0];
                if (state) {
                    totalReps += (state.reps || 0);
                    if (state.stability > 21) {
                        masteredCount++;
                        const deck = decks.find(d => d.id === card.deck_id);
                        if (deck?.subject.toLowerCase().includes('math')) mathMastered = true;
                    }
                    if (new Date(state.due_date) <= now) {
                        const deck = decks.find(d => d.id === card.deck_id);
                        if (deck) dueSubjects.add(deck.subject);
                    }
                } else {
                    const deck = decks.find(d => d.id === card.deck_id);
                    if (deck) dueSubjects.add(deck.subject);
                }
            });

            if (totalReps >= 10) await grant('Card Shark 🃏');
            if (totalReps >= 100) await grant('Century Club 💯');
            if (masteredCount >= 10) await grant('Memory Machine 🤖');
            if (mathMastered) await grant('Math Wizard 🧙');
            if (dueSubjects.size >= 3) await grant('Brain Garden 🌿');

            // Speed Demon is handled in localStorage per session in StudyPage
        }
    }
}

// ─── STATS ───────────────────────────────────────────────
export async function getDeckStats(deckId: string) {
    const { data: { session } } = await supabase.auth.getSession()
    const userId = session?.user?.id || "00000000-0000-0000-0000-000000000000"

    const { data: cards, error } = await supabase
        .from('cards')
        .select(`id, card_states(*)`)
        .eq('deck_id', deckId)

    if (error) throw error

    const now = new Date()
    let mastered = 0, learning = 0, due = 0, newCards = 0

    cards.forEach(card => {
        const state = card.card_states?.[0]
        if (!state) { newCards++; return }

        if (state.state === 'review' && state.stability > 21) mastered++
        else if (state.state === 'learning' || state.state === 'relearning') learning++
        else if (new Date(state.due_date) <= now) due++
        else newCards++
    })

    return { mastered, learning, due, newCards, total: cards.length }
}

// ─── HELPER ──────────────────────────────────────────────
function fileToBase64(file: File): Promise<string> {
    return new Promise((resolve, reject) => {
        const reader = new FileReader()
        reader.readAsDataURL(file)
        reader.onload = () => {
            const result = reader.result as string
            resolve(result.split(',')[1]) // strip data:application/pdf;base64,
        }
        reader.onerror = reject
    })
}
export async function logStudyActivity() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) return

    await supabase.rpc('increment_study_log', {
        p_user_id: session.user.id,
        p_date: new Date().toISOString().split('T')[0]
    })
}
export async function getAllStats() {
    const { data: { session } } = await supabase.auth.getSession()
    if (!session?.user) throw new Error('Not logged in')
    const userId = session.user.id
    const [cardStatesRes, decksRes, studyLogsRes, profileRes, cardsRes] = await Promise.all([
        supabase.from('card_states').select('stability, reps, state, card_id').eq('user_id', userId),
        supabase.from('decks').select('id, title, subject, card_count').eq('user_id', userId),
        supabase.from('study_logs').select('study_date, cards_reviewed').eq('user_id', userId).order('study_date', { ascending: true }),
        supabase.from('profiles').select('current_streak, best_streak, last_study_date').eq('id', userId).single(),
        supabase.from('cards').select('id, deck_id')
    ])
    const cardStates = cardStatesRes.data ?? []
    const decks = decksRes.data ?? []
    const studyLogs = studyLogsRes.data ?? []
    const profile = profileRes.data
    const cards = cardsRes.data ?? []
    const totalCards = cardStates.length
    const masteredCards = cardStates.filter(s => s.stability > 21).length
    const memoryScore = totalCards > 0
        ? Math.round(cardStates.filter(s => s.stability > 7).length / totalCards * 100)
        : 0
    const deckStats = decks.map(deck => {
        const deckCardIds = cards.filter(c => c.deck_id === deck.id).map(c => c.id)
        const deckStates = cardStates.filter(s => deckCardIds.includes(s.card_id))
        const rustyCount = deckStates.filter(s => s.state === 'review' && s.stability < 7).length
        const freshPercent = deckStates.length > 0
            ? Math.round((1 - rustyCount / deckStates.length) * 100)
            : 100
        return {
            id: deck.id,
            title: deck.title,
            subject: deck.subject,
            freshPercent,
            totalCards: deckStates.length
        }
    })
    return {
        totalCards,
        masteredCards,
        memoryScore,
        currentStreak: profile?.current_streak ?? 0,
        bestStreak: profile?.best_streak ?? 0,
        studyLogs,
        deckStats
    }
}
