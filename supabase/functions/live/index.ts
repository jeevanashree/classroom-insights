// Edge function: GET /live → Simulated live monitoring data
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  const emotions = ["Happy", "Neutral", "Bored"];
  const attentionLevel = Math.round(50 + Math.random() * 50); // 50-100%
  const detectedEmotion = emotions[Math.floor(Math.random() * emotions.length)];

  // Simulate per-student data
  const students = Array.from({ length: 6 }, (_, i) => ({
    name: `Student ${i + 1}`,
    attention: Math.round(50 + Math.random() * 50),
    emotion: emotions[Math.floor(Math.random() * emotions.length)],
  }));

  return new Response(
    JSON.stringify({
      attentionLevel,
      detectedEmotion,
      students,
      timestamp: new Date().toISOString(),
    }),
    { headers: { ...corsHeaders, "Content-Type": "application/json" } }
  );
});
