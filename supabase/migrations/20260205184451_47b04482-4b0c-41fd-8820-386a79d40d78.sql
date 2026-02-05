-- Add public read access for ready books (non-teacher-only)
CREATE POLICY "Public read access for ready books"
  ON public.books
  FOR SELECT
  USING (status = 'ready' AND NOT is_teacher_only);