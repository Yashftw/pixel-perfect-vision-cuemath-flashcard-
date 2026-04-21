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

async function generateCards(pdfBase64: string, subject: string): Promise<any[]> {
    const prompt = `You are an expert teacher creating flashcards for students aged 10-16.

Analyze this PDF and generate flashcards. Return ONLY a valid JSON array, no markdown, no extra text.

Rules:
- Cover key concepts, definitions, formulas, relationships, and worked examples
- Write ALL math using LaTeX: inline with $...$ and block with $$...$$
- Each card must be fully self-contained
- Vary card types: definition, formula, solve-this, explain-why, compare-contrast
- Generate 10-20 cards total
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

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get("GEMINI_API_KEY")}`,
        {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
                contents: [{
                    parts: [
                        { inline_data: { mime_type: "application/pdf", data: pdfBase64 } },
                        { text: prompt }
                    ]
                }],
                generationConfig: { temperature: 0.3, maxOutputTokens: 4000 }
            })
        }
    );

    const data = await response.json();

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error("Gemini response:", JSON.stringify(data));
        throw new Error("Gemini returned no content");
    }

    const text = data.candidates[0].content.parts[0].text;
    const clean = text.replace(/```json|```/g, "").trim();
    return JSON.parse(clean);
}

async function correctCards(cards: any[], subject: string): Promise<any[]> {
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

    const response = await fetch(
        `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${Deno.env.get("GEMINI_API_KEY")}`,
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

    if (!data.candidates?.[0]?.content?.parts?.[0]?.text) {
        console.error("Gemini correction response:", JSON.stringify(data));
        return cards; // fall back to uncorrected cards
    }

    const text = data.candidates[0].content.parts[0].text;
    const clean = text.replace(/```json|```/g, "").trim();
    try {
        return JSON.parse(clean);
    } catch {
        return cards; // fall back to uncorrected cards
    }
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
        const { deckId, pdfBase64, subject, userId } = await req.json();

        if (!deckId || !pdfBase64 || !userId) {
            throw new Error("Missing required fields: deckId, pdfBase64, userId");
        }

        const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

        console.log("Generating cards...");
        const rawCards = await generateCards(pdfBase64, subject || "General");

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