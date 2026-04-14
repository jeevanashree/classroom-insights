import { useEffect, useState } from "react";
import { Users, Brain, Smile } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import StatCard from "@/components/StatCard";

// Dashboard data shape
interface DashboardStats {
  totalStudents: number;
  avgAttention: number;
  emotions: { Happy: number; Neutral: number; Bored: number };
}

const Dashboard = () => {
  const [stats, setStats] = useState<DashboardStats | null>(null);
  const [loading, setLoading] = useState(true);

  // Fetch dashboard stats from edge function
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("stats");
        if (!error && data) setStats(data);
      } catch (err) {
        console.error("Failed to fetch stats:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchStats();
  }, []);

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <p className="text-muted-foreground">Loading dashboard...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Dashboard</h1>
        <p className="text-muted-foreground">Overview of classroom engagement metrics</p>
      </div>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <StatCard
          title="Total Students"
          value={stats?.totalStudents ?? 0}
          icon={<Users className="h-5 w-5" />}
          description="Currently enrolled"
          color="primary"
        />
        <StatCard
          title="Average Attention"
          value={`${stats?.avgAttention ?? 0}%`}
          icon={<Brain className="h-5 w-5" />}
          description="Current session"
          color="accent"
        />
        <StatCard
          title="Dominant Emotion"
          value={getDominantEmotion(stats?.emotions)}
          icon={<Smile className="h-5 w-5" />}
          description="Most common emotion"
          color="warning"
        />
      </div>

      {/* Emotion Distribution */}
      {stats?.emotions && (
        <div className="bg-card rounded-xl border p-6 shadow-sm">
          <h2 className="text-lg font-semibold mb-4 text-card-foreground">Emotion Distribution</h2>
          <div className="space-y-3">
            {Object.entries(stats.emotions).map(([emotion, percent]) => (
              <div key={emotion} className="flex items-center gap-3">
                <span className="w-20 text-sm font-medium text-muted-foreground">{emotion}</span>
                <div className="flex-1 bg-muted rounded-full h-3 overflow-hidden">
                  <div
                    className={`h-full rounded-full transition-all duration-500 ${
                      emotion === "Happy"
                        ? "bg-accent"
                        : emotion === "Neutral"
                        ? "bg-primary"
                        : "bg-warning"
                    }`}
                    style={{ width: `${percent}%` }}
                  />
                </div>
                <span className="w-10 text-sm text-right text-muted-foreground">{percent}%</span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

// Helper to find the dominant emotion
function getDominantEmotion(emotions?: { Happy: number; Neutral: number; Bored: number }) {
  if (!emotions) return "N/A";
  const entries = Object.entries(emotions);
  entries.sort((a, b) => b[1] - a[1]);
  return entries[0][0];
}

export default Dashboard;
