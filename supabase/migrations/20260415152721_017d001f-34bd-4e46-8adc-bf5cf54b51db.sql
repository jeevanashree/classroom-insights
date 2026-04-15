
-- Enable RLS on frame_logs
ALTER TABLE public.frame_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Auth users can view frame_logs" ON public.frame_logs FOR SELECT TO authenticated USING (true);
CREATE POLICY "Auth users can insert frame_logs" ON public.frame_logs FOR INSERT TO authenticated WITH CHECK (true);
