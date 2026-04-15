import { useEffect, useState, useRef } from "react";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useSpeechToText } from "@/hooks/useSpeechToText";
import { Copy, Mic, MicOff, Video, VideoOff, Users, PhoneOff } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { useNavigate } from "react-router-dom";

interface Participant { id: string; name: string; attention: number; emotion: string; updated_at: string; }
interface Props { meetingId: string; }

const EMOTIONS = ["Happy", "Sad", "Angry", "Surprised", "Neutral"] as const;
const emotionEmoji: Record<string, string> = { Happy: "😊", Sad: "😢", Angry: "😠", Surprised: "😲", Neutral: "😐" };
const emotionColor: Record<string, string> = { Happy: "text-green-400", Sad: "text-blue-400", Angry: "text-red-400", Surprised: "text-yellow-400", Neutral: "text-gray-400" };

const TeacherDashboard = ({ meetingId }: Props) => {
  const { toast } = useToast();
  const navigate = useNavigate();
  const [meetingCode, setMeetingCode] = useState("");
  const [participants, setParticipants] = useState<Participant[]>([]);
  const [localStream, setLocalStream] = useState<MediaStream | null>(null);
  const [isMicOn, setIsMicOn] = useState(true);
  const [isVideoOn, setIsVideoOn] = useState(true);
  const localVideoRef = useRef<HTMLVideoElement>(null);
  const captionChannelRef = useRef<any>(null);
  const { transcript, interimTranscript, isListening, startListening, stopListening } = useSpeechToText();

  useEffect(() => { supabase.from("meetings").select("code").eq("id", meetingId).single().then(({ data }) => { if (data) setMeetingCode(data.code); }); }, [meetingId]);

  useEffect(() => {
    let stream: MediaStream | null = null;
    (async () => {
      try {
        stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: true });
        setLocalStream(stream);
        if (localVideoRef.current) localVideoRef.current.srcObject = stream;
      } catch { toast({ title: "Camera error", description: "Could not access camera/mic", variant: "destructive" }); }
    })();
    return () => { stream?.getTracks().forEach((t) => t.stop()); };
  }, []);

  useEffect(() => {
    supabase.from("participants").select("*").eq("meeting_id", meetingId).then(({ data }) => { if (data) setParticipants(data as Participant[]); });
    const channel = supabase.channel(`p-${meetingId}`)
      .on("postgres_changes", { event: "*", schema: "public", table: "participants", filter: `meeting_id=eq.${meetingId}` }, (payload) => {
        if (payload.eventType === "INSERT") setParticipants((prev) => [...prev, payload.new as Participant]);
        else if (payload.eventType === "UPDATE") setParticipants((prev) => prev.map((p) => (p.id === (payload.new as any).id ? { ...p, ...(payload.new as Participant) } : p)));
      }).subscribe();
    return () => { supabase.removeChannel(channel); };
  }, [meetingId]);

  useEffect(() => {
    const ch = supabase.channel(`captions-${meetingId}`, { config: { broadcast: { self: false } } });
    ch.subscribe();
    captionChannelRef.current = ch;
    return () => { supabase.removeChannel(ch); };
  }, [meetingId]);

  useEffect(() => {
    captionChannelRef.current?.send({ type: "broadcast", event: "caption", payload: { text: transcript + interimTranscript } });
  }, [transcript, interimTranscript]);

  const toggleMic = () => { localStream?.getAudioTracks().forEach((t) => (t.enabled = !t.enabled)); setIsMicOn(!isMicOn); isMicOn ? stopListening() : startListening(); };
  const toggleVideo = () => { localStream?.getVideoTracks().forEach((t) => (t.enabled = !t.enabled)); setIsVideoOn(!isVideoOn); };
  const endMeeting = async () => { await supabase.from("meetings").update({ is_active: false } as any).eq("id", meetingId); localStream?.getTracks().forEach((t) => t.stop()); navigate("/"); };
  const copyCode = () => { navigator.clipboard.writeText(meetingCode); toast({ title: "Copied!", description: `Code: ${meetingCode}` }); };

  useEffect(() => { startListening(); return () => stopListening(); }, []);

  const avgAttention = participants.length ? Math.round(participants.reduce((s, p) => s + Number(p.attention), 0) / participants.length) : 0;
  const emotionCounts = EMOTIONS.reduce((acc, e) => { acc[e] = participants.filter((p) => p.emotion === e).length; return acc; }, {} as Record<string, number>);

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-xl font-bold text-foreground">Teacher Dashboard</h1>
          <div className="flex items-center gap-2 mt-1">
            <span className="text-sm text-muted-foreground">Code:</span>
            <span className="font-mono text-lg font-bold text-primary tracking-widest">{meetingCode}</span>
            <button onClick={copyCode} className="p-1 hover:bg-muted rounded"><Copy className="h-4 w-4 text-muted-foreground" /></button>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleMic} className={`p-2.5 rounded-lg ${isMicOn ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>{isMicOn ? <Mic className="h-4 w-4" /> : <MicOff className="h-4 w-4" />}</button>
          <button onClick={toggleVideo} className={`p-2.5 rounded-lg ${isVideoOn ? "bg-primary text-primary-foreground" : "bg-destructive text-destructive-foreground"}`}>{isVideoOn ? <Video className="h-4 w-4" /> : <VideoOff className="h-4 w-4" />}</button>
          <button onClick={endMeeting} className="px-4 py-2.5 rounded-lg bg-destructive text-destructive-foreground text-sm font-medium flex items-center gap-2"><PhoneOff className="h-4 w-4" /> End</button>
        </div>
      </div>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        <div className="lg:col-span-1">
          <div className="bg-card border rounded-xl overflow-hidden">
            <video ref={localVideoRef} autoPlay muted playsInline className="w-full aspect-video object-cover bg-black" />
            <div className="p-2 text-center text-sm text-muted-foreground">You</div>
          </div>
          <div className="mt-3 bg-card border rounded-xl p-3">
            <p className="text-xs font-medium text-muted-foreground mb-1">🎤 Live Captions {isListening ? "(active)" : "(paused)"}</p>
            <p className="text-sm text-foreground min-h-[40px]">{transcript.slice(-200)}<span className="text-muted-foreground italic">{interimTranscript}</span></p>
          </div>
        </div>
        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            <div className="bg-card border rounded-xl p-4 text-center"><Users className="h-5 w-5 mx-auto text-primary mb-1" /><p className="text-2xl font-bold text-foreground">{participants.length}</p><p className="text-xs text-muted-foreground">Students</p></div>
            <div className="bg-card border rounded-xl p-4 text-center"><p className="text-2xl font-bold text-foreground">{avgAttention}%</p><p className="text-xs text-muted-foreground">Avg Attention</p><div className="w-full bg-muted rounded-full h-1.5 mt-2"><div className="h-full bg-primary rounded-full transition-all" style={{ width: `${avgAttention}%` }} /></div></div>
            <div className="bg-card border rounded-xl p-4 col-span-2 sm:col-span-1"><p className="text-xs text-muted-foreground mb-2">Emotions</p>
              {EMOTIONS.map((e) => (<div key={e} className="flex items-center gap-1 text-xs mb-1"><span>{emotionEmoji[e]}</span><span className="w-14 text-foreground">{e}</span><div className="flex-1 bg-muted rounded-full h-1.5"><div className="h-full bg-primary/70 rounded-full" style={{ width: participants.length ? `${(emotionCounts[e] / participants.length) * 100}%` : "0%" }} /></div><span className="text-muted-foreground w-3 text-right">{emotionCounts[e]}</span></div>))}
            </div>
          </div>
          <div>
            <h2 className="text-sm font-semibold text-foreground mb-2">Students</h2>
            {participants.length === 0 ? <p className="text-sm text-muted-foreground">Waiting for students...</p> : (
              <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
                {participants.map((p) => (<div key={p.id} className="bg-card border rounded-xl p-3"><p className="text-sm font-medium text-foreground truncate">{p.name}</p><div className="flex items-center justify-between text-xs mt-1"><span className={Number(p.attention) >= 70 ? "text-green-400" : Number(p.attention) >= 40 ? "text-yellow-400" : "text-red-400"}>{p.attention}%</span><span>{emotionEmoji[p.emotion] || "😐"} <span className={emotionColor[p.emotion] || ""}>{p.emotion}</span></span></div></div>))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TeacherDashboard;
