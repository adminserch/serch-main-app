-- Create rate_limits table for centralized rate limiting
CREATE TABLE IF NOT EXISTS rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 1,
  reset_time BIGINT NOT NULL
);

-- Add index on reset_time for efficient cleanup
CREATE INDEX IF NOT EXISTS idx_rate_limits_reset_time ON rate_limits (reset_time);

-- Enable RLS on rate_limits
ALTER TABLE rate_limits ENABLE ROW LEVEL SECURITY;

-- Allow service role to perform all actions
CREATE POLICY "Allow service role all operations on rate_limits"
  ON rate_limits
  FOR ALL
  TO service_role
  USING (true)
  WITH CHECK (true);

-- Atomic rate limiting function
CREATE OR REPLACE FUNCTION increment_rate_limit(
  p_key TEXT,
  p_limit INT,
  p_window_ms BIGINT,
  p_now BIGINT
) RETURNS BOOLEAN AS $$
DECLARE
  v_count INT;
BEGIN
  -- Clean up expired entries
  DELETE FROM public.rate_limits WHERE reset_time < p_now;

  -- Upsert key
  INSERT INTO public.rate_limits (key, count, reset_time)
  VALUES (p_key, 1, p_now + p_window_ms)
  ON CONFLICT (key) DO UPDATE
  SET 
    count = CASE 
      WHEN public.rate_limits.reset_time < p_now THEN 1
      ELSE public.rate_limits.count + 1
    END,
    reset_time = CASE 
      WHEN public.rate_limits.reset_time < p_now THEN p_now + p_window_ms
      ELSE public.rate_limits.reset_time
    END
  RETURNING public.rate_limits.count INTO v_count;

  RETURN v_count > p_limit;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = '';
