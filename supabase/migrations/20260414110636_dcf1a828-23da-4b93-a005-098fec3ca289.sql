
-- Create reports table for classroom engagement data
CREATE TABLE public.reports (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  avg_attention NUMERIC NOT NULL,
  emotion TEXT NOT NULL CHECK (emotion IN ('Happy', 'Neutral', 'Bored')),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.reports ENABLE ROW LEVEL SECURITY;

-- Allow anyone to read reports (public dashboard)
CREATE POLICY "Anyone can view reports" ON public.reports FOR SELECT USING (true);

-- Allow service role to insert reports
CREATE POLICY "Service role can insert reports" ON public.reports FOR INSERT WITH CHECK (true);
