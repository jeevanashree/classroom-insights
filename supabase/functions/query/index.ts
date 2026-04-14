// Edge function: POST /query → Simple keyword-based NLP query processor
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const { query } = await req.json();
  const lowerQuery = (query || "").toLowerCase();

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
  const supabase = createClient(supabaseUrl, supabaseKey);

  let response = "";

  // Simple keyword matching
  if (lowerQuery.includes("today") || lowerQuery.includes("engagement")) {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("date", new Date().toISOString().split("T")[0])
      .limit(1);

    if (data && data.length > 0) {
      const r = data[0];
      response = `Today's engagement: Average attention is ${r.avg_attention}% with dominant emotion "${r.emotion}".`;
    } else {
      response = "No engagement data found for today.";
    }
  } else if (lowerQuery.includes("inattentive") || lowerQuery.includes("bored")) {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .lt("avg_attention", 70)
      .order("date", { ascending: false })
      .limit(5);

    if (data && data.length > 0) {
      const dates = data.map((r: any) => `${r.date} (${r.avg_attention}%, ${r.emotion})`).join(", ");
      response = `Sessions with low attention (<70%): ${dates}`;
    } else {
      response = "No sessions found with low attention levels. Great job!";
    }
  } else if (lowerQuery.includes("happy") || lowerQuery.includes("positive")) {
    const { data } = await supabase
      .from("reports")
      .select("*")
      .eq("emotion", "Happy")
      .order("date", { ascending: false })
      .limit(5);

    if (data && data.length > 0) {
      const dates = data.map((r: any) => `${r.date} (${r.avg_attention}%)`).join(", ");
      response = `Happy sessions: ${dates}`;
    } else {
      response = "No happy sessions found recently.";
    }
  } else if (lowerQuery.includes("average") || lowerQuery.includes("overall")) {
    const { data } = await supabase.from("reports").select("avg_attention");
    if (data && data.length > 0) {
      const avg = Math.round(data.reduce((s: number, r: any) => s + Number(r.avg_attention), 0) / data.length);
      response = `Overall average attention across ${data.length} sessions: ${avg}%`;
    } else {
      response = "No data available yet.";
    }
  } else {
    response = `I can help with queries like:\n• "Show today's engagement"\n• "Who is inattentive?"\n• "Show happy sessions"\n• "What's the overall average?"`;
  }

  return new Response(JSON.stringify({ query, response }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
