import { useEffect, useState } from "react";
import { supabase } from "@/integrations/supabase/client";

// Report row shape
interface Report {
  id: string;
  date: string;
  avg_attention: number;
  emotion: string;
}

const Reports = () => {
  const [reports, setReports] = useState<Report[]>([]);
  const [loading, setLoading] = useState(true);

  // Fetch reports from the edge function
  useEffect(() => {
    const fetchReports = async () => {
      try {
        const { data, error } = await supabase.functions.invoke("reports");
        if (!error && data) setReports(data);
      } catch (err) {
        console.error("Reports fetch error:", err);
      } finally {
        setLoading(false);
      }
    };
    fetchReports();
  }, []);

  // Emotion badge color
  const badgeColor = (emotion: string) => {
    switch (emotion) {
      case "Happy": return "bg-accent/15 text-accent";
      case "Bored": return "bg-warning/15 text-warning";
      default: return "bg-primary/15 text-primary";
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">Reports</h1>
        <p className="text-muted-foreground">Historical engagement data stored in the database</p>
      </div>

      <div className="bg-card border rounded-xl shadow-sm overflow-hidden">
        {loading ? (
          <div className="p-8 text-center text-muted-foreground">Loading reports...</div>
        ) : reports.length === 0 ? (
          <div className="p-8 text-center text-muted-foreground">No reports found.</div>
        ) : (
          <table className="w-full text-sm">
            <thead className="bg-muted/50">
              <tr>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Date</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Avg Attention</th>
                <th className="text-left px-6 py-3 font-medium text-muted-foreground">Dominant Emotion</th>
              </tr>
            </thead>
            <tbody>
              {reports.map((r) => (
                <tr key={r.id} className="border-t hover:bg-muted/30 transition-colors">
                  <td className="px-6 py-4 text-foreground">{r.date}</td>
                  <td className="px-6 py-4">
                    <div className="flex items-center gap-2">
                      <span className="font-medium text-foreground">{r.avg_attention}%</span>
                      <div className="w-20 bg-muted rounded-full h-2 overflow-hidden">
                        <div
                          className="h-full bg-primary rounded-full"
                          style={{ width: `${r.avg_attention}%` }}
                        />
                      </div>
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    <span className={`px-2.5 py-1 rounded-full text-xs font-medium ${badgeColor(r.emotion)}`}>
                      {r.emotion}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
};

export default Reports;
