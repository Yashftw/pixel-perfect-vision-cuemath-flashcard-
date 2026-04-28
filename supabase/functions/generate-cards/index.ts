// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;
const SUPABASE_URL = Deno.env.get("SUPABASE_URL")!;
const SUPABASE_SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

async function generateCards(pdfBase64: string | null, subject: string, cardCount: number, existingCards?: any[], retries = 3): Promise<any[]> {
    const isNew = !pdfBase64;
    const existingContext = existingCards?.length 
        ? `Avoid these exact existing questions:\n${JSON.stringify(existingCards.slice(0, 10))}` 
        : '';
        
    const prompt = `You are an expert teacher creating flashcards for students aged 10-16.

${pdfBase64 ? 'Analyze this PDF and generate flashcards.' : `Generate flashcards based on the subject: ${subject}. ${existingContext}`}
Return ONLY a valid JSON array, no markdown, no extra text.

Rules:
- Cover key concepts, definitions, formulas, relationships, and worked examples
- Write ALL math using LaTeX: inline with $...$ and block with $$...$$
- Each card must be fully self-contained
- Vary card types: definition, formula, solve-this, explain-why, compare-contrast
- Generate EXACTLY ${cardCount} cards — no more, no fewer
- Keep answers under 80 words
- Language must be simple enough for a 12-year-old

Return this exact structure:
[
  {
    "question": "string",
    "answer": "string",
    "hint": "string",
    "concept_cluster": "string",
    "type": "definition|formula|solve-this|explain-why|compare-contrast"
  }
]

Subject: ${subject}`;

    for (let i = 0; i < retries; i++) {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{
                        parts: pdfBase64 ? [
                            { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
                            { text: prompt }
                        ] : [
                            { text: prompt }
                        ]
                    }],
                    generationConfig: { temperature: 0.3, maxOutputTokens: 4000 }
                })
            }
        );

        const data = await response.json();

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = data.candidates[0].content.parts[0].text;
            const clean = text.replace(/```json|```/g, "").trim();
            try {
                const parsed = JSON.parse(clean);
                if (Array.isArray(parsed)) {
                    // Try to generate more if under 30
                    if (parsed.length < cardCount && retries > 1) {
                        const needed = cardCount - parsed.length;
                        console.log(`Generated ${parsed.length}, need ${needed} more...`);
                        const moreCards = await generateCards(pdfBase64, subject, needed, parsed, retries - 1);
                        return [...parsed, ...moreCards].slice(0, cardCount);
                    }
                    return parsed.slice(0, cardCount);
                }
            } catch (e) {
                console.error("Failed to parse JSON:", e);
            }
        }

        if (data.error?.code === 503 && i < retries - 1) {
            console.log(`Gemini overloaded, retrying in ${(i + 1) * 2}s...`);
            await new Promise(r => setTimeout(r, (i + 1) * 2000));
        } else if (i === retries - 1) {
            console.error("Gemini response:", JSON.stringify(data));
            throw new Error("Gemini returned no content or invalid content after all retries");
        }
    }

    return [];
}

async function correctCards(cards: any[], subject: string, retries = 3): Promise<any[]> {
    const prompt = `You are a strict educational quality reviewer.

Review and fix these flashcards. Return ONLY the corrected JSON array, no markdown, no extra text.

Fix:
1. Broken LaTeX syntax
2. Language too complex for a 12-year-old — simplify it
3. Ambiguous questions — make them specific
4. Missing hints — add one
5. Answers over 80 words — condense them

Do NOT remove any cards. Return same JSON structure.

Cards:
${JSON.stringify(cards, null, 2)}

Subject: ${subject}`;

    for (let i = 0; i < retries; i++) {
        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 4000 }
                })
            }
        );

        const data = await response.json();

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            const text = data.candidates[0].content.parts[0].text;
            const clean = text.replace(/```json|```/g, "").trim();
            try {
                return JSON.parse(clean);
            } catch {
                return cards;
            }
        }

        if (data.error?.code === 503 && i < retries - 1) {
            console.log(`Gemini overloaded on correction, retrying in ${(i + 1) * 2}s...`);
            await new Promise(r => setTimeout(r, (i + 1) * 2000));
        } else {
            console.error("Gemini correction response:", JSON.stringify(data));
            return cards;
        }
    }

    return cards;
}

function orderCardsPedagogically(cards: any[]): any[] {
    const typeOrder: Record<string, number> = {
        "definition": 0,
        "formula": 1,
        "solve-this": 2,
        "explain-why": 2,
        "compare-contrast": 3,
    };
    return cards
        .sort((a, b) => (typeOrder[a.type] ?? 2) - (typeOrder[b.type] ?? 2))
        .map((card, index) => ({ ...card, order_index: index }));
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { deckId, pdfBase64, subject, userId, cardCount = 30, existingCards } = await req.json();

        if (!deckId || !userId) {
            throw new Error("Missing required fields: deckId, userId");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        console.log(`Generating ${cardCount} cards...`);
        const rawCards = await generateCards(pdfBase64, subject || "General", cardCount, existingCards);

        console.log(`Generated ${rawCards.length} cards. Correcting...`);
        const correctedCards = await correctCards(rawCards, subject || "General");

        const orderedCards = orderCardsPedagogically(correctedCards);

        const { data: insertedCards, error: cardError } = await supabase
            .from("cards")
            .insert(orderedCards.map(card => ({
                deck_id: deckId,
                question: card.question,
                answer: card.answer,
                hint: card.hint,
                concept_cluster: card.concept_cluster,
                order_index: card.order_index,
            })))
            .select();

        if (cardError) throw cardError;

        const { error: stateError } = await supabase
            .from("card_states")
            .insert(
                insertedCards.map(card => ({
                    card_id: card.id,
                    user_id: userId,
                    stability: 1.0,
                    difficulty: 5.0,
                    reps: 0,
                    lapses: 0,
                    state: "new",
                    due_date: new Date().toISOString(),
                }))
            );

        if (stateError) throw stateError;

        await supabase
            .from("decks")
            .update({ card_count: insertedCards.length })
            .eq("id", deckId);

        console.log(`Done. ${insertedCards.length} cards created.`);

        return new Response(
            JSON.stringify({ success: true, cardCount: insertedCards.length }),
            { headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );

    } catch (err: any) {
        console.error("Error:", err);
        return new Response(
            JSON.stringify({ error: err.message || err.toString() }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
