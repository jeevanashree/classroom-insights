import { useEffect, useState, useCallback } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Users, Brain, Smile, Copy, Check } from "lucide-react";
import StatCard from "@/components/StatCard";

// Participant type from DB
interface Participant {
  id: string;
  name: string;
  attention: number;
  emotion: string;
  updated_at: string;
}

interface Meeting {
  id: string;
  code: string;
  teacher_name: string;
  is_active: boolean;
}

const TeacherDashboard = () => {
  const { meetingId } = useParams();
  const [meeting, setMeeting] = useState<Meeting | null>(null);
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [copied, setCopied] = useState(false);

  // Fetch meeting info
  useEffect(() => {
    const fetchMeeting = async () => {
      const { data } = await supabase
        .from("meetings")
        .select("*")
        .eq("id", meetingId!)
        .single();
      if (data) setMeeting(data);
    };
    fetchMeeting();
  }, [meetingId]);

  // Fetch initial participants
  useEffect(() => {
    const fetchParticipants = async () => {
      const { data } = await supabase
        .from("participants")
        .select("*")
        .eq("meeting_id", meetingId!);
      if (data) setParticipants(data);
    };
    fetchParticipants();
  }, [meetingId]);

  // Subscribe to realtime changes on participants
  useEffect(() => {
    const channel = supabase
      .channel(`participants-${meetingId}`)
      .on(
        "postgres_changes",
        {
          event: "*",
          schema: "public",
          table: "participants",
          filter: `meeting_id=eq.${meetingId}`,
        },
        (payload) => {
          if (payload.eventType === "INSERT") {
            setParticipants((prev) => [...prev, payload.new as Participant]);
          } else if (payload.eventType === "UPDATE") {
            setParticipants((prev) =>
              prev.map((p) => (p.id === (payload.new as Participant).id ? (payload.new as Participant) : p))
            );
          } else if (payload.eventType === "DELETE") {
            setParticipants((prev) => prev.filter((p) => p.id !== (payload.old as any).id));
          }
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  // Copy code to clipboard
  const copyCode = useCallback(() => {
    if (meeting?.code) {
      navigator.clipboard.writeText(meeting.code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  }, [meeting]);

  // End meeting
  const endMeeting = async () => {
    await supabase.from("meetings").update({ is_active: false }).eq("id", meetingId!);
    setMeeting((prev) => prev ? { ...prev, is_active: false } : null);
  };

  // Compute stats
  const avgAttention = participants.length
    ? Math.round(participants.reduce((s, p) => s + p.attention, 0) / participants.length)
    : 0;

  const emotionCounts = { Happy: 0, Neutral: 0, Bored: 0 };
  participants.forEach((p) => {
    if (p.emotion in emotionCounts) emotionCounts[p.emotion as keyof typeof emotionCounts]++;
  });
  const dominantEmotion = Object.entries(emotionCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "N/A";

  const emotionColor = (emotion: string) => {
    switch (emotion) {
      case "Happy": return "text-accent";
      case "Bored": return "text-warning";
      default: return "text-primary";
    }
  };

  if (!meeting) {
    return <div className="text-center py-12 text-muted-foreground">Loading meeting...</div>;
  }

  return (
    <div className="space-y-6">
      {/* Header with meeting code */}
      <div className="flex items-start justify-between flex-wrap gap-4">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Teacher Dashboard</h1>
          <p className="text-muted-foreground">Welcome, {meeting.teacher_name}</p>
        </div>
        <div className="flex items-center gap-3">
          <div className="bg-card border rounded-xl px-5 py-3 flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Join Code:</span>
            <span className="font-mono text-xl font-bold tracking-widest text-foreground">{meeting.code}</span>
            <button onClick={copyCode} className="text-muted-foreground hover:text-foreground transition-colors">
              {copied ? <Check className="h-4 w-4 text-accent" /> : <Copy className="h-4 w-4" />}
            </button>
          </div>
          {meeting.is_active && (
            <button
              onClick={endMeeting}
              className="px-4 py-3 rounded-xl bg-destructive text-destructive-foreground text-sm font-medium hover:bg-destructive/90 transition-colors"
            >
              End Meeting
            </button>
          )}
        </div>
      </div>

      {!meeting.is_active && (
        <div className="bg-destructive/10 text-destructive px-4 py-3 rounded-lg text-sm font-medium">
          This meeting has ended.
        </div>
      )}

      {/* Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Students Joined"
          value={participants.length}
          icon={<Users className="h-5 w-5" />}
          color="primary"
        />
        <StatCard
          title="Avg Attention"
          value={`${avgAttention}%`}
          icon={<Brain className="h-5 w-5" />}
          color="accent"
        />
        <StatCard
          title="Dominant Emotion"
          value={dominantEmotion}
          icon={<Smile className="h-5 w-5" />}
          color="warning"
        />
      </div>

      {/* Emotion distribution bars */}
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-card-foreground">Emotion Distribution</h2>
        {participants.length === 0 ? (
          <p className="text-muted-foreground text-sm">Waiting for students to join...</p>
        ) : (
          <div className="space-y-3">
            {Object.entries(emotionCounts).map(([emotion, count]) => {
              const pct = Math.round((count / participants.length) * 100);
              return (
                <div key={emotion} className="flex items-center gap-3">
                  <span className="w-16 text-sm font-medium text-muted-foreground">{emotion}</span>
                  <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-500 ${
                        emotion === "Happy" ? "bg-accent" : emotion === "Neutral" ? "bg-primary" : "bg-warning"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
                  </div>
                  <span className="w-16 text-sm text-right text-muted-foreground">{count} ({pct}%)</span>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Per-student cards */}
      <div className="bg-card border rounded-xl p-6 shadow-sm">
        <h2 className="text-lg font-semibold mb-4 text-card-foreground">Students ({participants.length})</h2>
        {participants.length === 0 ? (
          <p className="text-muted-foreground text-sm">Share the code above with your students to get started.</p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {participants.map((p) => (
              <div key={p.id} className="flex items-center justify-between bg-muted/50 rounded-lg p-4">
                <div>
                  <p className="font-medium text-foreground">{p.name}</p>
                  <p className={`text-sm ${emotionColor(p.emotion)}`}>{p.emotion}</p>
                </div>
                <div className="text-right">
                  <p className="text-lg font-bold text-foreground">{p.attention}%</p>
                  <div className="w-16 bg-muted rounded-full h-1.5 mt-1">
                    <div
                      className="h-full bg-primary rounded-full transition-all duration-700"
                      style={{ width: `${p.attention}%` }}
                    />
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherDashboard;
