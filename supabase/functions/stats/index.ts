// Edge function: GET /stats → Dashboard statistics
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  // Simulated dashboard stats
  const totalStudents = 32;
  const avgAttention = Math.round(65 + Math.random() * 25); // 65-90
  const emotions = {
    Happy: Math.round(30 + Math.random() * 30),
    Neutral: 0,
    Bored: 0,
  };
  emotions.Neutral = Math.round((100 - emotions.Happy) * 0.6);
  emotions.Bored = 100 - emotions.Happy - emotions.Neutral;

  return new Response(
    JSON.stringify({
      totalStudents,
      avgAttention,
      emotions,
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
