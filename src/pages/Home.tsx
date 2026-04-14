import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { supabase } from "@/integrations/supabase/client";
import { GraduationCap, Users } from "lucide-react";

// Home page: choose to create or join a meeting
const Home = () => {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"choose" | "create" | "join">("choose");
  const [name, setName] = useState("");
  const [code, setCode] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  // Generate a random 6-character code
  const generateCode = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    return Array.from({ length: 6 }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
  };

  // Teacher creates a new meeting
  const handleCreate = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    setLoading(true);
    setError("");

    const meetingCode = generateCode();
    const { data, error: err } = await supabase
      .from("meetings")
      .insert({ code: meetingCode, teacher_name: name.trim() })
      .select()
      .single();

    if (err || !data) {
      setError("Failed to create meeting. Try again.");
      setLoading(false);
      return;
    }

    // Navigate to teacher dashboard
    navigate(`/meeting/${data.id}?role=teacher`);
  };

  // Student joins an existing meeting
  const handleJoin = async () => {
    if (!name.trim()) { setError("Please enter your name"); return; }
    if (!code.trim()) { setError("Please enter the meeting code"); return; }
    setLoading(true);
    setError("");

    // Find the meeting by code
    const { data: meeting, error: err } = await supabase
      .from("meetings")
      .select("*")
      .eq("code", code.trim().toUpperCase())
      .eq("is_active", true)
      .single();

    if (err || !meeting) {
      setError("Meeting not found or no longer active.");
      setLoading(false);
      return;
    }

    // Add participant
    const { data: participant, error: joinErr } = await supabase
      .from("participants")
      .insert({ meeting_id: meeting.id, name: name.trim() })
      .select()
      .single();

    if (joinErr || !participant) {
      setError("Failed to join meeting.");
      setLoading(false);
      return;
    }

    // Navigate to student view
    navigate(`/meeting/${meeting.id}?role=student&pid=${participant.id}`);
  };

  return (
    <div className="min-h-[70vh] flex items-center justify-center">
      <div className="w-full max-w-md">
        {mode === "choose" ? (
          <div className="space-y-6 text-center">
            <div>
              <h1 className="text-3xl font-bold text-foreground">Smart Classroom</h1>
              <p className="text-muted-foreground mt-2">Real-time engagement analyzer</p>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <button
                onClick={() => setMode("create")}
                className="bg-card border rounded-xl p-6 hover:border-primary transition-colors group"
              >
                <GraduationCap className="h-10 w-10 mx-auto mb-3 text-primary group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-foreground">I'm a Teacher</p>
                <p className="text-xs text-muted-foreground mt-1">Create a meeting</p>
              </button>
              <button
                onClick={() => setMode("join")}
                className="bg-card border rounded-xl p-6 hover:border-accent transition-colors group"
              >
                <Users className="h-10 w-10 mx-auto mb-3 text-accent group-hover:scale-110 transition-transform" />
                <p className="font-semibold text-foreground">I'm a Student</p>
                <p className="text-xs text-muted-foreground mt-1">Join a meeting</p>
              </button>
            </div>
          </div>
        ) : (
          <div className="bg-card border rounded-xl p-8 space-y-5">
            <button
              onClick={() => { setMode("choose"); setError(""); }}
              className="text-sm text-muted-foreground hover:text-foreground transition-colors"
            >
              ← Back
            </button>

            <h2 className="text-xl font-bold text-foreground">
              {mode === "create" ? "Create Meeting" : "Join Meeting"}
            </h2>

            {error && (
              <p className="text-sm text-destructive bg-destructive/10 px-3 py-2 rounded-lg">{error}</p>
            )}

            <div className="space-y-3">
              <div>
                <label className="text-sm font-medium text-foreground">Your Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Enter your name"
                  className="mt-1 w-full px-4 py-2.5 rounded-lg bg-muted text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
                />
              </div>

              {mode === "join" && (
                <div>
                  <label className="text-sm font-medium text-foreground">Meeting Code</label>
                  <input
                    type="text"
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="e.g. ABC123"
                    maxLength={6}
                    className="mt-1 w-full px-4 py-2.5 rounded-lg bg-muted text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring tracking-widest font-mono text-center text-lg"
                  />
                </div>
              )}
            </div>

            <button
              onClick={mode === "create" ? handleCreate : handleJoin}
              disabled={loading}
              className="w-full py-2.5 rounded-lg bg-primary text-primary-foreground font-medium hover:bg-primary/90 disabled:opacity-50 transition-colors"
            >
              {loading ? "Please wait..." : mode === "create" ? "Create Meeting" : "Join Meeting"}
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default Home;
