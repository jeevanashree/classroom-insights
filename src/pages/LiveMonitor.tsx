import { useEffect, useState } from "react";
import { Monitor, Wifi } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Live data shape from the edge function
interface LiveData {
  attentionLevel: number;
  detectedEmotion: string;
  students: { name: string; attention: number; emotion: string }[];
  timestamp: string;
}

const LiveMonitor = () => {
  const [data, setData] = useState<LiveData | null>(null);
  const [isPolling, setIsPolling] = useState(true);

  // Poll the /live endpoint every 4 seconds
  useEffect(() => {
    const fetchLive = async () => {
      try {
        const { data: result, error } = await supabase.functions.invoke("live");
        if (!error && result) setData(result);
      } catch (err) {
        console.error("Live fetch error:", err);
      }
    };

    fetchLive(); // initial fetch
    const interval = setInterval(() => {
      if (isPolling) fetchLive();
    }, 4000);

    return () => clearInterval(interval);
  }, [isPolling]);

  // Emotion color helper
  const emotionColor = (emotion: string) => {
    switch (emotion) {
      case "Happy": return "text-accent";
      case "Bored": return "text-warning";
      default: return "text-primary";
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Live Monitor</h1>
          <p className="text-muted-foreground">Real-time classroom engagement (simulated)</p>
        </div>
        <button
          onClick={() => setIsPolling(!isPolling)}
          className={`flex items-center gap-2 px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
            isPolling
              ? "bg-accent text-accent-foreground"
              : "bg-muted text-muted-foreground"
          }`}
        >
          <Wifi className="h-4 w-4" />
          {isPolling ? "Live" : "Paused"}
        </button>
      </div>

      {/* Video Placeholder + Stats */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Webcam placeholder */}
        <div className="lg:col-span-2 bg-card border rounded-xl overflow-hidden shadow-sm">
          <div className="bg-muted aspect-video flex items-center justify-center">
            <div className="text-center text-muted-foreground">
              <Monitor className="h-16 w-16 mx-auto mb-2 opacity-40" />
              <p className="text-sm">Webcam Feed Placeholder</p>
              <p className="text-xs mt-1">Connect a camera to enable real monitoring</p>
            </div>
          </div>
        </div>

        {/* Live stats panel */}
        <div className="bg-card border rounded-xl p-6 shadow-sm space-y-6">
          <div>
            <p className="text-sm text-muted-foreground mb-1">Attention Level</p>
            <p className="text-4xl font-bold text-foreground">{data?.attentionLevel ?? 0}%</p>
            <div className="mt-2 bg-muted rounded-full h-3 overflow-hidden">
              <div
                className="h-full bg-primary rounded-full transition-all duration-700"
                style={{ width: `${data?.attentionLevel ?? 0}%` }}
              />
            </div>
          </div>
          <div>
            <p className="text-sm text-muted-foreground mb-1">Detected Emotion</p>
            <p className={`text-3xl font-bold ${emotionColor(data?.detectedEmotion ?? "")}`}>
              {data?.detectedEmotion ?? "—"}
            </p>
          </div>
          {data?.timestamp && (
            <p className="text-xs text-muted-foreground">
              Updated: {new Date(data.timestamp).toLocaleTimeString()}
            </p>
          )}
        </div>
      </div>

      {/* Per-student breakdown */}
      {data?.students && (
        <div className="bg-card border rounded-xl p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-card-foreground">Student Breakdown</h2>
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {data.students.map((s) => (
              <div key={s.name} className="flex items-center justify-between bg-muted/50 rounded-lg p-3">
                <div>
                  <p className="text-sm font-medium text-foreground">{s.name}</p>
                  <p className={`text-xs ${emotionColor(s.emotion)}`}>{s.emotion}</p>
                </div>
                <span className="text-sm font-semibold text-foreground">{s.attention}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default LiveMonitor;
