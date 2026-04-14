import { ReactNode } from "react";

// Reusable stat card component
interface StatCardProps {
  title: string;
  value: string | number;
  icon: ReactNode;
  description?: string;
  color?: "primary" | "accent" | "warning";
}

const StatCard = ({ title, value, icon, description, color = "primary" }: StatCardProps) => {
  const colorMap = {
    primary: "bg-primary/10 text-primary",
    accent: "bg-accent/10 text-accent",
    warning: "bg-warning/10 text-warning",
  };

  return (
    <div className="bg-card rounded-xl border p-6 shadow-sm">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-sm font-medium text-muted-foreground">{title}</h3>
        <div className={`p-2 rounded-lg ${colorMap[color]}`}>{icon}</div>
      </div>
      <p className="text-3xl font-bold text-card-foreground">{value}</p>
      {description && <p className="text-sm text-muted-foreground mt-1">{description}</p>}
    </div>
  );
};

export default StatCard;
