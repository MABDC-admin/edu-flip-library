-- Create user_assigned_books table
CREATE TABLE IF NOT EXISTS public.user_assigned_books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, book_id)
);

-- Enable RLS
ALTER TABLE public.user_assigned_books ENABLE ROW LEVEL SECURITY;

-- RLS Policies for user_assigned_books
DO $$ 
BEGIN
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Admins can manage assignments') THEN
        CREATE POLICY "Admins can manage assignments" ON public.user_assigned_books FOR ALL TO authenticated USING (public.is_admin(auth.uid()));
    END IF;
    IF NOT EXISTS (SELECT 1 FROM pg_policies WHERE policyname = 'Users can see their assignments') THEN
        CREATE POLICY "Users can see their assignments" ON public.user_assigned_books FOR SELECT TO authenticated USING (user_id = auth.uid());
    END IF;
END $$;

-- Update can_access_book helper to include assignments
CREATE OR REPLACE FUNCTION public.can_access_book(_book_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.books b
    WHERE b.id = _book_id
      AND (
        public.is_privileged(auth.uid())
        OR (
          b.status = 'ready'
          AND (
            -- Original grade-level match
            b.grade_level = (SELECT grade_level FROM public.profiles WHERE id = auth.uid())
            -- OR manual assignment
            OR EXISTS (
              SELECT 1 FROM public.user_assigned_books uab
              WHERE uab.book_id = _book_id AND uab.user_id = auth.uid()
            )
          )
          AND NOT b.is_teacher_only
        )
      )
  )
$$;

-- Update Books visibility policy
DROP POLICY IF EXISTS "Books visibility" ON public.books;
CREATE POLICY "Books visibility" ON public.books FOR SELECT TO authenticated 
  USING (
    public.is_privileged(auth.uid()) 
    OR (
      status = 'ready' 
      AND (
        grade_level = (SELECT grade_level FROM public.profiles WHERE id = auth.uid())
        OR EXISTS (
          SELECT 1 FROM public.user_assigned_books uab
          WHERE uab.book_id = public.books.id AND uab.user_id = auth.uid()
        )
      )
      AND NOT is_teacher_only
    )
  );
