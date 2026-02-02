-- Add enhanced RLS policies for Quipper content management

-- Drop existing policy for books insert/update/delete that allows all privileged users
DROP POLICY IF EXISTS "Privileged full access books" ON public.books;

-- Create a new policy that allows teachers to manage internal books but only admins to manage Quipper books
CREATE POLICY "Teachers and admins can manage internal books" ON public.books FOR ALL TO authenticated 
  USING (
    (public.is_teacher(auth.uid()) AND source = 'internal' AND uploaded_by = auth.uid())
    OR 
    (public.is_admin(auth.uid()))
  )
  WITH CHECK (
    (public.is_teacher(auth.uid()) AND source = 'internal' AND uploaded_by = auth.uid())
    OR 
    (public.is_admin(auth.uid()))
  );

-- Update Quipper content policy to allow both admins and teachers from any school to access
CREATE POLICY "Admins and teachers can manage Quipper content" ON public.books FOR ALL TO authenticated 
  USING (
    (public.is_admin(auth.uid()) OR public.is_teacher(auth.uid())) AND source = 'quipper'
  )
  WITH CHECK (
    (public.is_admin(auth.uid()) OR public.is_teacher(auth.uid())) AND source = 'quipper'
  );

-- Ensure admins have full access to all books regardless of source
CREATE POLICY "Admins full access to all books" ON public.books FOR ALL TO authenticated 
  USING (public.is_admin(auth.uid()))
  WITH CHECK (public.is_admin(auth.uid()));

-- Ensure existing select policy remains in place for general visibility
-- Update to allow Quipper content to be visible to admins and teachers from any school
CREATE OR REPLACE FUNCTION public.can_access_book(_book_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.books b
    JOIN public.profiles p ON p.id = auth.uid()
    WHERE b.id = _book_id
      AND (
        public.is_privileged(auth.uid())
        OR (
          b.status = 'ready'
          AND b.grade_level = p.grade_level
          AND NOT b.is_teacher_only
          AND b.source = 'internal'  -- Students can only access internal content
        )
      )
  )
$$;

-- Refresh the existing select policy to use the updated function
DROP POLICY IF EXISTS "Books visibility" ON public.books;
CREATE POLICY "Books visibility" ON public.books FOR SELECT TO authenticated 
  USING (
    public.is_privileged(auth.uid()) 
    OR (
      status = 'ready' 
      AND grade_level = (SELECT grade_level FROM public.profiles WHERE id = auth.uid())
      AND NOT is_teacher_only
      AND source = 'internal'  -- Students can only access internal content
    )
  );

-- Create a specific policy for Quipper content visibility for admins and teachers
CREATE POLICY "Quipper content visibility" ON public.books FOR SELECT TO authenticated 
  USING (
    (public.is_admin(auth.uid()) OR public.is_teacher(auth.uid()))
    AND source = 'quipper'
  );