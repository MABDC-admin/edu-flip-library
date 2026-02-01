-- Teacher-specific policies
-- Teachers can view all books regardless of grade level
CREATE POLICY "Teachers can view all books" 
ON public.books 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'teacher'
  )
);

-- Teachers can view all reading progress
CREATE POLICY "Teachers can view all reading progress" 
ON public.reading_progress 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'teacher'
  )
);

-- Teachers can view all student profiles
CREATE POLICY "Teachers can view all profiles" 
ON public.profiles 
FOR SELECT 
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.user_roles 
    WHERE user_id = auth.uid() 
    AND role = 'teacher'
  )
);