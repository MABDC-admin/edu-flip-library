-- Relax Books isolation policy to allow admins to manage books across schools
-- and ensure global books (school_id is null) are always visible.

DROP POLICY IF EXISTS "Books school isolation" ON public.books;
DROP POLICY IF EXISTS "Books visibility" ON public.books;

CREATE POLICY "Books school isolation" ON public.books 
FOR SELECT TO authenticated 
USING (
    -- Admiins can see everything to manage across schools
    public.is_admin(auth.uid())
    OR 
    -- Regular users see their school's books + global books
    (
        (school_id IS NULL OR school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid()))
        AND (
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
    )
);

-- Allow admins to insert/update/delete books for any school
DROP POLICY IF EXISTS "Only admins can insert books" ON public.books;
CREATE POLICY "Only admins can insert books" ON public.books FOR INSERT TO authenticated WITH CHECK (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can update books" ON public.books;
CREATE POLICY "Only admins can update books" ON public.books FOR UPDATE TO authenticated USING (public.is_admin(auth.uid()));

DROP POLICY IF EXISTS "Only admins can delete books" ON public.books;
CREATE POLICY "Only admins can delete books" ON public.books FOR DELETE TO authenticated USING (public.is_admin(auth.uid()));
