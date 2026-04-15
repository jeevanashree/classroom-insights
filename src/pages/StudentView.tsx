import { useEffect, useRef, useState } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useWebcamEmotions } from "@/hooks/useWebcamEmotions";
import { useWebRTC } from "@/hooks/useWebRTC";
import { Wifi, WifiOff } from "lucide-react";

const EMOTIONS = ["Happy", "Sad", "Angry", "Surprised", "Neutral"] as const;

const emotionEmoji: Record<string, string> = {
  Happy: "😊", Sad: "😢", Angry: "😠", Surprised: "😲", Neutral: "😐",
};

const emotionColor: Record<string, string> = {
  Happy: "text-green-400", Sad: "text-blue-400", Angry: "text-red-400",
  Surprised: "text-yellow-400", Neutral: "text-gray-400",
};

interface Props {
  meetingId: string;
  participantId: string;
}

const StudentView = ({ meetingId, participantId }: Props) => {
  const { user, profile } = useAuth();

  const [meetingActive, setMeetingActive] = useState(true);
  const [caption, setCaption] = useState("");
  const [teacherName, setTeacherName] = useState("Teacher");

  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const teacherVideoRef = useRef<HTMLVideoElement>(null);

  // Webcam emotion analysis
  const { videoRef, modelsLoaded, emotion, attention, allEmotions, cameraError, stream } =
    useWebcamEmotions();

  // WebRTC - send our video to teacher
  const { remoteStreams, sendOffer } = useWebRTC(
    meetingId,
    user?.id || "",
    "student",
    stream
  );

  // Fetch meeting info and teacher user_id
  useEffect(() => {
    supabase
      .from("meetings")
      .select("is_active, teacher_name, user_id")
      .eq("id", meetingId)
      .single()
      .then(({ data }: { data: any }) => {
        if (data) {
          setMeetingActive(data.is_active);
          setTeacherName(data.teacher_name);

          // Send WebRTC offer to teacher
          if (data.user_id && user?.id) {
            setTimeout(() => sendOffer(data.user_id), 2000);
          }
        }
      });
  }, [meetingId, user?.id, sendOffer]);

  // Display teacher's video from remote streams
  useEffect(() => {
    // The first remote stream should be the teacher's
    const entries = Array.from(remoteStreams.entries());
    if (entries.length > 0 && teacherVideoRef.current) {
      teacherVideoRef.current.srcObject = entries[0][1];
    }
  }, [remoteStreams]);

  // Subscribe to meeting status changes
  useEffect(() => {
    const channel = supabase
      .channel(`meeting-status-${meetingId}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "meetings", filter: `id=eq.${meetingId}` },
        (payload) => setMeetingActive((payload.new as any).is_active)
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  // Subscribe to live captions from teacher
  useEffect(() => {
    const channel = supabase.channel(`captions-${meetingId}`, {
      config: { broadcast: { self: false } },
    });

    channel.on("broadcast", { event: "caption" }, ({ payload }) => {
      setCaption(payload.text || "");
    });

    channel.subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  }, [meetingId]);

  // Push emotion + attention to database every 3 seconds
  useEffect(() => {
    if (!participantId || !meetingActive || !modelsLoaded) return;

    intervalRef.current = setInterval(async () => {
      await supabase
        .from("participants")
        .update({
          attention,
          emotion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", participantId);
    }, 3000);

    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [participantId, meetingActive, modelsLoaded, attention, emotion]);

  return (
    <div className="space-y-4 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-foreground">
            Hi, {profile?.display_name || "Student"}! 🎓
          </h1>
          <p className="text-sm text-muted-foreground">Class by {teacherName}</p>
        </div>
        <div
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
            meetingActive ? "bg-green-500/10 text-green-400" : "bg-red-500/10 text-red-400"
          }`}
        >
          {meetingActive ? <Wifi className="h-3 w-3" /> : <WifiOff className="h-3 w-3" />}
          {meetingActive ? "Live" : "Ended"}
        </div>
      </div>

      {/* Camera error */}
      {cameraError && (
        <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-lg">{cameraError}</div>
      )}

      {/* Models loading */}
      {!modelsLoaded && !cameraError && (
        <div className="text-sm text-muted-foreground text-center py-4">Loading AI models...</div>
      )}

      {/* Video section */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
        {/* Teacher's video */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <div className="relative">
            {remoteStreams.size > 0 ? (
              <video
                ref={teacherVideoRef}
                autoPlay
                playsInline
                className="w-full aspect-video object-cover bg-black"
              />
            ) : (
              <div className="w-full aspect-video bg-muted flex items-center justify-center">
                <div className="text-center">
                  <span className="text-4xl">🧑‍🏫</span>
                  <p className="text-xs text-muted-foreground mt-1">Connecting to teacher...</p>
                </div>
              </div>
            )}
          </div>
          <div className="p-2 text-center text-sm text-muted-foreground">{teacherName}</div>
        </div>

        {/* Student's own camera (for emotion detection) */}
        <div className="bg-card border rounded-xl overflow-hidden">
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            className="w-full aspect-video object-cover bg-black"
          />
          <div className="p-2 text-center text-sm text-muted-foreground">You</div>
        </div>
      </div>

      {/* Live Captions */}
      {caption && (
        <div className="bg-card border rounded-xl p-4">
          <p className="text-xs font-medium text-muted-foreground mb-1">🎤 Teacher is speaking:</p>
          <p className="text-sm text-foreground">{caption}</p>
        </div>
      )}

      {/* Engagement Stats */}
      <div className="bg-card border rounded-xl p-4 space-y-4">
        {/* Attention ring */}
        <div className="flex items-center gap-6">
          <div className="relative w-24 h-24 flex-shrink-0">
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
              <span className="text-lg font-bold text-foreground">{attention}%</span>
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground">Your Attention</p>
            <p className="text-3xl mt-1">{emotionEmoji[emotion]}</p>
            <p className={`text-sm font-medium ${emotionColor[emotion]}`}>{emotion}</p>
          </div>
        </div>

        {/* All emotions bar */}
        <div>
          <p className="text-xs text-muted-foreground mb-2">Emotion Breakdown</p>
          <div className="space-y-1.5">
            {EMOTIONS.map((e) => (
              <div key={e} className="flex items-center gap-2 text-xs">
                <span className="w-5 text-center">{emotionEmoji[e]}</span>
                <span className="w-16 text-foreground">{e}</span>
                <div className="flex-1 bg-muted rounded-full h-1.5">
                  <div
                    className="h-full bg-primary/70 rounded-full transition-all duration-500"
                    style={{ width: `${(allEmotions[e] || 0) * 100}%` }}
                  />
                </div>
                <span className="text-muted-foreground w-8 text-right">
                  {Math.round((allEmotions[e] || 0) * 100)}%
                </span>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentView;
