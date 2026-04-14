import { useEffect, useState, useRef } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Wifi, WifiOff } from "lucide-react";

const EMOTIONS = ["Happy", "Neutral", "Bored"] as const;

const StudentView = () => {
  const { meetingId } = useParams();
  const [searchParams] = useSearchParams();
  const participantId = searchParams.get("pid");

  const [attention, setAttention] = useState(75);
  const [emotion, setEmotion] = useState<string>("Neutral");
  const [meetingActive, setMeetingActive] = useState(true);
  const [studentName, setStudentName] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Fetch initial participant info
  useEffect(() => {
    const fetchParticipant = async () => {
      if (!participantId) return;
      const { data } = await supabase
        .from("participants")
        .select("*")
        .eq("id", participantId)
        .single();
      if (data) {
        setStudentName(data.name);
        setAttention(data.attention);
        setEmotion(data.emotion);
      }
    };
    fetchParticipant();
  }, [participantId]);

  // Check if meeting is still active
  useEffect(() => {
    const checkMeeting = async () => {
      const { data } = await supabase
        .from("meetings")
        .select("is_active")
        .eq("id", meetingId!)
        .single();
      if (data) setMeetingActive(data.is_active);
    };
    checkMeeting();

    // Subscribe to meeting changes
    const channel = supabase
      .channel(`meeting-${meetingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "meetings", filter: `id=eq.${meetingId}` },
        (payload) => {
          setMeetingActive((payload.new as any).is_active);
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [meetingId]);

  // Auto-simulate engagement: update attention and emotion every 3-5 seconds
  useEffect(() => {
    if (!participantId || !meetingActive) return;

    const simulate = async () => {
      // Random walk for attention: ±10 from current, clamped to 50-100
      const delta = Math.floor(Math.random() * 21) - 10; // -10 to +10
      const newAttention = Math.min(100, Math.max(50, attention + delta));
      const newEmotion = EMOTIONS[Math.floor(Math.random() * EMOTIONS.length)];

      setAttention(newAttention);
      setEmotion(newEmotion);

      // Push to Supabase (this triggers realtime for teacher)
      await supabase
        .from("participants")
        .update({
          attention: newAttention,
          emotion: newEmotion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", participantId);
    };

    // Random interval between 3-5 seconds
    const startInterval = () => {
      const delay = 3000 + Math.random() * 2000;
      intervalRef.current = setTimeout(() => {
        simulate();
        startInterval();
      }, delay) as unknown as ReturnType<typeof setInterval>;
    };

    startInterval();

    return () => {
      if (intervalRef.current) clearTimeout(intervalRef.current as unknown as number);
    };
  }, [participantId, meetingActive, attention]);

  const emotionEmoji = (e: string) => {
    switch (e) {
      case "Happy": return "😊";
      case "Bored": return "😴";
      default: return "😐";
    }
  };

  const emotionColor = (e: string) => {
    switch (e) {
      case "Happy": return "text-accent";
      case "Bored": return "text-warning";
      default: return "text-primary";
    }
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-sm text-center space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Hi, {studentName}!</h1>
          <p className="text-muted-foreground mt-1">You're in the classroom</p>
        </div>

        {/* Connection status */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          meetingActive ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
        }`}>
          {meetingActive ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {meetingActive ? "Meeting Active" : "Meeting Ended"}
        </div>

        {/* Current engagement display */}
        <div className="bg-card border rounded-xl p-8 space-y-6">
          {/* Attention circle */}
          <div>
            <p className="text-sm text-muted-foreground mb-3">Your Attention Level</p>
            <div className="relative w-36 h-36 mx-auto">
              <svg className="w-full h-full -rotate-90" viewBox="0 0 120 120">
                <circle cx="60" cy="60" r="50" fill="none" stroke="hsl(var(--muted))" strokeWidth="10" />
                <circle
                  cx="60" cy="60" r="50" fill="none"
                  stroke="hsl(var(--primary))"
                  strokeWidth="10"
                  strokeDasharray={`${(attention / 100) * 314} 314`}
                  strokeLinecap="round"
                  className="transition-all duration-700"
                />
              </svg>
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-3xl font-bold text-foreground">{attention}%</span>
              </div>
            </div>
          </div>

          {/* Emotion */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Current Emotion</p>
            <p className="text-5xl mb-1">{emotionEmoji(emotion)}</p>
            <p className={`text-lg font-semibold ${emotionColor(emotion)}`}>{emotion}</p>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Your engagement is being simulated and shared with your teacher in real time.
        </p>
      </div>
    </div>
  );
};

export default StudentView;
