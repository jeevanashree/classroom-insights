import { useState } from "react";
import { Send } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";

// Chat message shape
interface Message {
  role: "user" | "assistant";
  text: string;
}

const Query = () => {
  const [input, setInput] = useState("");
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);

  // Send query to the edge function
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setMessages((prev) => [...prev, { role: "user", text: userMsg }]);
    setInput("");
    setLoading(true);

    try {
      const { data, error } = await supabase.functions.invoke("query", {
        body: { query: userMsg },
      });

      if (!error && data) {
        setMessages((prev) => [...prev, { role: "assistant", text: data.response }]);
      } else {
        setMessages((prev) => [...prev, { role: "assistant", text: "Sorry, something went wrong." }]);
      }
    } catch {
      setMessages((prev) => [...prev, { role: "assistant", text: "Failed to process query." }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-foreground">NLP Query</h1>
        <p className="text-muted-foreground">Ask questions about classroom engagement in natural language</p>
      </div>

      {/* Chat area */}
      <div className="bg-card border rounded-xl shadow-sm flex flex-col" style={{ height: "500px" }}>
        {/* Messages */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {messages.length === 0 && (
            <div className="text-center text-muted-foreground py-12">
              <p className="text-sm">Try asking:</p>
              <div className="mt-3 space-y-1">
                {["Show today's engagement", "Who is inattentive?", "Show happy sessions", "What's the overall average?"].map((q) => (
                  <button
                    key={q}
                    onClick={() => setInput(q)}
                    className="block mx-auto text-sm text-primary hover:underline"
                  >
                    "{q}"
                  </button>
                ))}
              </div>
            </div>
          )}
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2.5 rounded-xl text-sm whitespace-pre-wrap ${
                  msg.role === "user"
                    ? "bg-primary text-primary-foreground"
                    : "bg-muted text-foreground"
                }`}
              >
                {msg.text}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="bg-muted text-muted-foreground px-4 py-2.5 rounded-xl text-sm">
                Thinking...
              </div>
            </div>
          )}
        </div>

        {/* Input */}
        <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder="Ask about classroom engagement..."
            className="flex-1 px-4 py-2.5 rounded-lg bg-muted text-foreground text-sm placeholder:text-muted-foreground outline-none focus:ring-2 focus:ring-ring"
          />
          <button
            type="submit"
            disabled={loading || !input.trim()}
            className="px-4 py-2.5 rounded-lg bg-primary text-primary-foreground hover:bg-primary/90 disabled:opacity-50 transition-colors"
          >
            <Send className="h-4 w-4" />
          </button>
        </form>
      </div>
    </div>
  );
};

export default Query;
