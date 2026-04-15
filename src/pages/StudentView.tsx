import { useEffect, useRef, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { Wifi, WifiOff } from "lucide-react";
import { useWebcamAnalysis } from "@/hooks/useWebcamAnalysis";

const StudentView = () => {
  const { meetingId } = useParams();
  const [searchParams] = useSearchParams();
  const participantId = searchParams.get("pid");

  const [meetingActive, setMeetingActive] = useState(true);
  const [studentName, setStudentName] = useState("");
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const { videoRef, modelsLoaded, emotion, attention, micVolume, cameraError } =
    useWebcamAnalysis();

  // Map face-api emotions → your app's format
  const mappedEmotion = mapEmotion(emotion);

  // Fetch participant name
  useEffect(() => {
    if (!participantId) return;
    supabase
      .from("participants")
      .select("name")
      .eq("id", participantId)
      .single()
      .then(({ data }) => { if (data) setStudentName(data.name); });
  }, [participantId]);

  // Check meeting active + subscribe
  useEffect(() => {
    supabase
      .from("meetings")
      .select("is_active")
      .eq("id", meetingId!)
      .single()
      .then(({ data }) => { if (data) setMeetingActive(data.is_active); });

    const channel = supabase
      .channel(`meeting-${meetingId}`)
      .on("postgres_changes",
        { event: "UPDATE", schema: "public", table: "meetings", filter: `id=eq.${meetingId}` },
        (payload) => setMeetingActive((payload.new as any).is_active)
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, [meetingId]);

  // Push real data to Supabase every 3 seconds
  useEffect(() => {
    if (!participantId || !meetingActive || !modelsLoaded) return;

    intervalRef.current = setInterval(async () => {
      await supabase
        .from("participants")
        .update({
          attention,
          emotion: mappedEmotion,
          updated_at: new Date().toISOString(),
        })
        .eq("id", participantId);
    }, 3000);

    return () => { if (intervalRef.current) clearInterval(intervalRef.current); };
  }, [participantId, meetingActive, modelsLoaded, attention, mappedEmotion]);

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

        {/* Status */}
        <div className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-medium ${
          meetingActive ? "bg-accent/10 text-accent" : "bg-destructive/10 text-destructive"
        }`}>
          {meetingActive ? <Wifi className="h-4 w-4" /> : <WifiOff className="h-4 w-4" />}
          {meetingActive ? "Meeting Active" : "Meeting Ended"}
        </div>

        {/* Camera error */}
        {cameraError && (
          <div className="bg-destructive/10 text-destructive text-sm px-4 py-2 rounded-lg">
            {cameraError}
          </div>
        )}

        {/* Models loading */}
        {!modelsLoaded && !cameraError && (
          <p className="text-sm text-muted-foreground">Loading AI models, please wait...</p>
        )}

        {/* Live webcam preview */}
        <video
          ref={videoRef}
          autoPlay
          muted
          playsInline
          className="mx-auto rounded-xl w-48 border"
        />

        {/* Engagement card */}
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
            <p className="text-5xl mb-1">{emotionEmoji(mappedEmotion)}</p>
            <p className={`text-lg font-semibold ${emotionColor(mappedEmotion)}`}>{mappedEmotion}</p>
          </div>

          {/* Mic activity */}
          <div>
            <p className="text-sm text-muted-foreground mb-2">Mic Activity</p>
            <div className="w-full bg-muted rounded-full h-2">
              <div
                className="h-full bg-accent rounded-full transition-all duration-300"
                style={{ width: `${micVolume}%` }}
              />
            </div>
          </div>
        </div>

        <p className="text-xs text-muted-foreground">
          Your camera and mic are being used to measure engagement in real time.
        </p>
      </div>
    </div>
  );
};

// Map face-api emotions to your app's 3 emotions
function mapEmotion(faceApiEmotion: string): string {
  switch (faceApiEmotion) {
    case "happy": return "Happy";
    case "sad":
    case "sleepy":
    case "disgusted":
    case "absent": return "Bored";
    default: return "Neutral";
  }
}

export default StudentView;