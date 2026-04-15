import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { messages } = await req.json();
    const LOVABLE_API_KEY = Deno.env.get("LOVABLE_API_KEY");
    if (!LOVABLE_API_KEY) throw new Error("LOVABLE_API_KEY is not configured");

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseKey);

    // Fetch context data from database
    let dbContext = "";

    // Get active meetings + participants
    const { data: meetings } = await supabase
      .from("meetings")
      .select("id, code, teacher_name, is_active, created_at")
      .order("created_at", { ascending: false })
      .limit(5);

    if (meetings && meetings.length > 0) {
      dbContext += `\n## Active/Recent Meetings:\n`;
      for (const m of meetings) {
        dbContext += `- Meeting "${m.code}" by ${m.teacher_name} (${m.is_active ? "ACTIVE" : "ended"})\n`;

        const { data: participants } = await supabase
          .from("participants")
          .select("name, attention, emotion, updated_at")
          .eq("meeting_id", m.id);

        if (participants && participants.length > 0) {
          const avgAttn = Math.round(
            participants.reduce((s: number, p: any) => s + Number(p.attention), 0) / participants.length
          );
          const emotions: Record<string, number> = {};
          participants.forEach((p: any) => {
            emotions[p.emotion] = (emotions[p.emotion] || 0) + 1;
          });

          dbContext += `  Students (${participants.length}): Avg attention ${avgAttn}%\n`;
          dbContext += `  Emotions: ${Object.entries(emotions).map(([e, c]) => `${e}: ${c}`).join(", ")}\n`;
          dbContext += `  Individual:\n`;
          participants.forEach((p: any) => {
            dbContext += `    - ${p.name}: ${p.attention}% attention, ${p.emotion}\n`;
          });
        }
      }
    }

    // Get recent reports
    const { data: reports } = await supabase
      .from("reports")
      .select("*")
      .order("date", { ascending: false })
      .limit(7);

    if (reports && reports.length > 0) {
      dbContext += `\n## Recent Reports (last 7 days):\n`;
      reports.forEach((r: any) => {
        dbContext += `- ${r.date}: ${r.avg_attention}% avg attention, dominant emotion: ${r.emotion}\n`;
      });
    }

    const systemPrompt = `You are an AI assistant for the Smart Classroom Engagement Analyzer. You help teachers understand student engagement patterns.

You have access to real-time classroom data:
${dbContext || "No data available yet."}

Guidelines:
- Give specific, data-driven answers based on the real data above
- Use student names when discussing individual engagement
- Highlight students with low attention (<60%) as potentially disengaged
- Suggest actionable teaching strategies when engagement is low
- Be concise but thorough
- Use markdown formatting for clarity
- If asked about data you don't have, say so honestly`;

    const response = await fetch("https://ai.gateway.lovable.dev/v1/chat/completions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${LOVABLE_API_KEY}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "google/gemini-3-flash-preview",
        messages: [
          { role: "system", content: systemPrompt },
          ...messages.map((m: any) => ({ role: m.role, content: m.content })),
        ],
        stream: true,
      }),
    });

    if (!response.ok) {
      if (response.status === 429) {
        return new Response(JSON.stringify({ error: "Rate limited, please try again later." }), {
          status: 429,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      if (response.status === 402) {
        return new Response(JSON.stringify({ error: "Credits exhausted. Add funds in workspace settings." }), {
          status: 402,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        });
      }
      const t = await response.text();
      console.error("AI gateway error:", response.status, t);
      return new Response(JSON.stringify({ error: "AI service error" }), {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    return new Response(response.body, {
      headers: { ...corsHeaders, "Content-Type": "text/event-stream" },
    });
  } catch (e) {
    console.error("Chat error:", e);
    return new Response(JSON.stringify({ error: e instanceof Error ? e.message : "Unknown error" }), {
      status: 500,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
