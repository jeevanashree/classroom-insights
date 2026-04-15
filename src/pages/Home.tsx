import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { useAuth } from "@/contexts/AuthContext";
import { useToast } from "@/hooks/use-toast";
import { Plus, LogIn } from "lucide-react";

const Home = () => {
  const { profile, user } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();
  const [teacherName, setTeacherName] = useState("");
  const [joinCode, setJoinCode] = useState("");
  const [loading, setLoading] = useState(false);

  const handleCreateMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const code = Math.random().toString(36).substring(2, 8).toUpperCase();
    const { data, error } = await supabase
      .from("meetings")
      .insert({ code, teacher_name: teacherName || profile?.display_name || "Teacher", is_active: true } as any)
      .select().single();
    setLoading(false);
    if (error) { toast({ title: "Failed", description: error.message, variant: "destructive" }); }
    else if (data) { navigate(`/meeting/${data.id}?role=teacher`); }
  };

  const handleJoinMeeting = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setLoading(true);
    const { data: meeting, error } = await supabase.from("meetings").select("*").eq("code", joinCode.toUpperCase()).eq("is_active", true).single();
    if (error || !meeting) { setLoading(false); toast({ title: "Not found", description: "Check code.", variant: "destructive" }); return; }
    const { data: participant, error: pErr } = await supabase.from("participants").insert({ meeting_id: meeting.id, name: profile?.display_name || "Student" } as any).select().single();
    setLoading(false);
    if (pErr) { toast({ title: "Failed", description: pErr.message, variant: "destructive" }); }
    else if (participant) { navigate(`/meeting/${meeting.id}?role=student&pid=${participant.id}`); }
  };

  if (!user) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center">
        <div className="text-center space-y-4">
          <h1 className="text-3xl font-bold text-foreground">Smart Classroom</h1>
          <p className="text-muted-foreground">Engagement Analyzer with Real-Time AI</p>
          <div className="flex gap-3 justify-center mt-6">
            <button onClick={() => navigate("/login")} className="px-6 py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm">Sign In</button>
            <button onClick={() => navigate("/signup")} className="px-6 py-2.5 rounded-lg border border-border text-foreground font-medium text-sm">Sign Up</button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-lg space-y-8">
        <div className="text-center">
          <h1 className="text-3xl font-bold text-foreground">Hi, {profile?.display_name || "there"}! 👋</h1>
          <p className="text-muted-foreground mt-1">{profile?.role === "teacher" ? "Create a meeting to start monitoring" : "Join with your teacher's code"}</p>
        </div>
        {profile?.role === "teacher" && (
          <form onSubmit={handleCreateMeeting} className="bg-card border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><Plus className="h-5 w-5" /> Create Meeting</h2>
            <input type="text" value={teacherName} onChange={(e) => setTeacherName(e.target.value)} placeholder={profile?.display_name || "Teacher"} maxLength={100} className="w-full px-3 py-2 rounded-lg bg-muted text-foreground text-sm border border-border focus:ring-2 focus:ring-ring outline-none" />
            <button type="submit" disabled={loading} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50">{loading ? "Creating..." : "Create Meeting"}</button>
          </form>
        )}
        {profile?.role === "student" && (
          <form onSubmit={handleJoinMeeting} className="bg-card border rounded-xl p-6 space-y-4">
            <h2 className="text-lg font-semibold text-foreground flex items-center gap-2"><LogIn className="h-5 w-5" /> Join Meeting</h2>
            <input type="text" value={joinCode} onChange={(e) => setJoinCode(e.target.value.toUpperCase())} required maxLength={6} placeholder="ENTER CODE" className="w-full px-4 py-3 rounded-lg bg-muted text-foreground text-lg font-mono text-center tracking-widest border border-border focus:ring-2 focus:ring-ring outline-none uppercase" />
            <button type="submit" disabled={loading || joinCode.length < 4} className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium text-sm disabled:opacity-50">{loading ? "Joining..." : "Join Meeting"}</button>
          </form>
        )}
      </div>
    </div>
  );
};

export default Home;
