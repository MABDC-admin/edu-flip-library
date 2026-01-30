-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'student');

-- Create enum for book processing status
CREATE TYPE public.book_status AS ENUM ('processing', 'ready', 'error');

-- Create profiles table
CREATE TABLE public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  grade_level INT CHECK (grade_level >= 1 AND grade_level <= 12),
  avatar_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create user_roles table (separate from profiles for security)
CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role app_role NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (user_id, role)
);

-- Create books table
CREATE TABLE public.books (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  title TEXT NOT NULL,
  grade_level INT NOT NULL CHECK (grade_level >= 1 AND grade_level <= 12),
  cover_url TEXT,
  page_count INT DEFAULT 0,
  status book_status NOT NULL DEFAULT 'processing',
  uploaded_by UUID REFERENCES auth.users(id),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create book_pages table
CREATE TABLE public.book_pages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  page_number INT NOT NULL,
  image_url TEXT NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (book_id, page_number)
);

-- Create reading_progress table
CREATE TABLE public.reading_progress (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  student_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  book_id UUID NOT NULL REFERENCES public.books(id) ON DELETE CASCADE,
  current_page INT NOT NULL DEFAULT 1,
  completed BOOLEAN NOT NULL DEFAULT false,
  last_read_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  UNIQUE (student_id, book_id)
);

-- Create indexes for performance
CREATE INDEX idx_books_grade_level ON public.books(grade_level);
CREATE INDEX idx_books_status ON public.books(status);
CREATE INDEX idx_book_pages_book_id ON public.book_pages(book_id);
CREATE INDEX idx_book_pages_page_number ON public.book_pages(book_id, page_number);
CREATE INDEX idx_reading_progress_student ON public.reading_progress(student_id);
CREATE INDEX idx_reading_progress_book ON public.reading_progress(book_id);
CREATE INDEX idx_user_roles_user_id ON public.user_roles(user_id);

-- Create helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Create helper function to check if user can access a book (grade-level matching)
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
      AND b.status = 'ready'
      AND (
        public.is_admin(auth.uid())
        OR b.grade_level = p.grade_level
      )
  )
$$;

-- Create updated_at trigger function
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_books_updated_at
  BEFORE UPDATE ON public.books
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_reading_progress_updated_at
  BEFORE UPDATE ON public.reading_progress
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Enable RLS on all tables
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.books ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.book_pages ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reading_progress ENABLE ROW LEVEL SECURITY;

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile or admins can view all"
  ON public.profiles FOR SELECT
  TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own profile"
  ON public.profiles FOR INSERT
  TO authenticated
  WITH CHECK (id = auth.uid());

CREATE POLICY "Users can update their own profile or admins can update any"
  ON public.profiles FOR UPDATE
  TO authenticated
  USING (id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete profiles"
  ON public.profiles FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS Policies for user_roles
CREATE POLICY "Users can view their own role or admins can view all"
  ON public.user_roles FOR SELECT
  TO authenticated
  USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Only admins can assign roles"
  ON public.user_roles FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update roles"
  ON public.user_roles FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete roles"
  ON public.user_roles FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS Policies for books
CREATE POLICY "Admins can view all books, students see grade-matching ready books"
  ON public.books FOR SELECT
  TO authenticated
  USING (
    public.is_admin(auth.uid()) 
    OR (
      status = 'ready' 
      AND grade_level = (SELECT grade_level FROM public.profiles WHERE id = auth.uid())
    )
  );

CREATE POLICY "Only admins can insert books"
  ON public.books FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update books"
  ON public.books FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete books"
  ON public.books FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS Policies for book_pages
CREATE POLICY "Users can view pages of accessible books"
  ON public.book_pages FOR SELECT
  TO authenticated
  USING (public.can_access_book(book_id));

CREATE POLICY "Only admins can insert book pages"
  ON public.book_pages FOR INSERT
  TO authenticated
  WITH CHECK (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update book pages"
  ON public.book_pages FOR UPDATE
  TO authenticated
  USING (public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete book pages"
  ON public.book_pages FOR DELETE
  TO authenticated
  USING (public.is_admin(auth.uid()));

-- RLS Policies for reading_progress
CREATE POLICY "Users can view their own progress or admins can view all"
  ON public.reading_progress FOR SELECT
  TO authenticated
  USING (student_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can insert their own reading progress"
  ON public.reading_progress FOR INSERT
  TO authenticated
  WITH CHECK (student_id = auth.uid());

CREATE POLICY "Users can update their own progress or admins can update any"
  ON public.reading_progress FOR UPDATE
  TO authenticated
  USING (student_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can delete their own progress or admins can delete any"
  ON public.reading_progress FOR DELETE
  TO authenticated
  USING (student_id = auth.uid() OR public.is_admin(auth.uid()));

-- Create storage buckets
INSERT INTO storage.buckets (id, name, public) VALUES ('book-covers', 'book-covers', true);
INSERT INTO storage.buckets (id, name, public) VALUES ('book-pages', 'book-pages', false);
INSERT INTO storage.buckets (id, name, public) VALUES ('pdf-uploads', 'pdf-uploads', false);

-- Storage policies for book-covers (public read)
CREATE POLICY "Anyone can view book covers"
  ON storage.objects FOR SELECT
  USING (bucket_id = 'book-covers');

CREATE POLICY "Only admins can upload book covers"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'book-covers' AND public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update book covers"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'book-covers' AND public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete book covers"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'book-covers' AND public.is_admin(auth.uid()));

-- Storage policies for book-pages (authenticated users with book access)
CREATE POLICY "Authenticated users can view book pages"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'book-pages');

CREATE POLICY "Only admins can upload book pages"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'book-pages' AND public.is_admin(auth.uid()));

CREATE POLICY "Only admins can update book pages"
  ON storage.objects FOR UPDATE
  TO authenticated
  USING (bucket_id = 'book-pages' AND public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete book pages"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'book-pages' AND public.is_admin(auth.uid()));

-- Storage policies for pdf-uploads (admin only)
CREATE POLICY "Only admins can view PDFs"
  ON storage.objects FOR SELECT
  TO authenticated
  USING (bucket_id = 'pdf-uploads' AND public.is_admin(auth.uid()));

CREATE POLICY "Only admins can upload PDFs"
  ON storage.objects FOR INSERT
  TO authenticated
  WITH CHECK (bucket_id = 'pdf-uploads' AND public.is_admin(auth.uid()));

CREATE POLICY "Only admins can delete PDFs"
  ON storage.objects FOR DELETE
  TO authenticated
  USING (bucket_id = 'pdf-uploads' AND public.is_admin(auth.uid()));

-- Create function to handle new user profile creation
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (id, name, grade_level)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'grade_level')::int, 1)
  );
  
  -- Assign default student role
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'student');
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for auto-creating profiles on signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();