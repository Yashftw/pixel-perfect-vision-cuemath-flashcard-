// @ts-nocheck
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import { reviewCard } from "../_shared/fsrs.ts";

const SUPABASE_URL = "https://fhfvgdeokmlcxweqxgig.supabase.co";
const SUPABASE_SERVICE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZoZnZnZGVva21sY3h3ZXF4Z2lnIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImlhdCI6MTc3NjY4NjEzMCwiZXhwIjoyMDkyMjYyMTMwfQ.FVq_40d_u0HQEo8ZmR4FftLmMDCmlnWUXI4KTcbalaY";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { cardId, userId, rating } = await req.json();

    if (!cardId || !userId || !rating) {
      throw new Error("Missing required fields: cardId, userId, rating");
    }

    if (![1, 2, 3, 4].includes(rating)) {
      throw new Error("Rating must be 1, 2, 3, or 4");
    }

    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

    // Fetch current card state
    const { data: stateRow, error: fetchError } = await supabase
      .from("card_states")
      .select("*")
      .eq("card_id", cardId)
      .eq("user_id", userId)
      .maybeSingle();
      
    let currentState: any;
    
    if (fetchError) {
      throw fetchError;
    } else if (!stateRow) {
      // No state exists, initialize a new state
      currentState = {
        stability: 0,
        difficulty: 0,
        reps: 0,
        lapses: 0,
        state: 'new',
        due_date: new Date(),
        last_review: null,
      };
    } else {
      currentState = {
        stability: stateRow.stability,
        difficulty: stateRow.difficulty,
        reps: stateRow.reps,
        lapses: stateRow.lapses,
        state: stateRow.state,
        due_date: new Date(stateRow.due_date),
        last_review: stateRow.last_review ? new Date(stateRow.last_review) : null,
      };
    }

    // Run FSRS
    const result = reviewCard(currentState, rating);

    // Upsert card state
    const { error: updateError } = await supabase
      .from("card_states")
      .upsert({
        card_id: cardId,
        user_id: userId,
        stability: result.stability,
        difficulty: result.difficulty,
        reps: result.reps,
        lapses: result.lapses,
        state: result.state,
        due_date: result.due_date.toISOString(),
        last_review: result.last_review.toISOString(),
      }, { onConflict: 'card_id,user_id' });

    if (updateError) throw updateError;

    return new Response(
      JSON.stringify({
        success: true,
        next_due: result.due_date,
        interval_days: result.interval_days,
        new_state: result.state,
      }),
      { headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err: any) {
    console.error("Error:", err);
    return new Response(
      JSON.stringify({ error: err.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});