import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const GEMINI_API_KEY = Deno.env.get("GEMINI_API_KEY")!;

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { query } = await req.json();

        if (!query) {
            throw new Error("Missing required field: query");
        }

        const prompt = `You are a math formula assistant. The user will ask for a math or physics formula.
Respond ONLY with the core formula using clear math notation. Do not use markdown backticks. Do not include any explanations. Do not use block latex ($$). You may use ^ for superscripts.

For example, if the user asks "area of a circle", respond exactly with:
A = \\pi r^2

If the user asks "pythagorean theorem", respond exactly with:
a^2 + b^2 = c^2

User Query: ${query}`;

        const response = await fetch(
            `https://generativelanguage.googleapis.com/v1beta/models/gemini-3.1-flash-lite-preview:generateContent?key=${GEMINI_API_KEY}`,
            {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({
                    contents: [{ parts: [{ text: prompt }] }],
                    generationConfig: { temperature: 0.1, maxOutputTokens: 50 }
                })
            }
        );

        const data = await response.json();

        if (data.error) {
            throw new Error(data.error.message || JSON.stringify(data.error));
        }

        if (data.candidates?.[0]?.content?.parts?.[0]?.text) {
            let formula = data.candidates[0].content.parts[0].text.trim();
            formula = formula.replace(/^\$+|\$+$/g, ''); // strip any accidentally included dollar signs
            return new Response(
                JSON.stringify({ formula }),
                { headers: { ...corsHeaders, "Content-Type": "application/json" } }
            );
        }

        throw new Error(`AI generated no text. Response: ${JSON.stringify(data)}`);

    } catch (err: any) {
        console.error("Error:", err);
        return new Response(
            JSON.stringify({ error: err.message || err.toString() }),
            { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
        );
    }
});
