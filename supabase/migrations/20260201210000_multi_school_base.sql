-- Phase 1: Multi-School Foundation

-- 1. Create Schools Table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL UNIQUE,
    short_name TEXT NOT NULL UNIQUE, -- e.g. MABDC, SFXSAI
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 2. Create Academic Years Table
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    label TEXT NOT NULL UNIQUE, -- e.g. 2026-2027
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- 3. Seed Initial Schools and Default Academic Year
INSERT INTO public.schools (name, short_name, slug) VALUES 
('M.A Brain Development Center', 'MABDC', 'mabdc'),
('St. Francis Xavier Smart Academy Inc', 'SFXSAI', 'sfxsai')
ON CONFLICT (short_name) DO NOTHING;

INSERT INTO public.academic_years (label, is_active) VALUES 
('2026-2027', TRUE)
ON CONFLICT (label) DO NOTHING;

-- 4. Add Multi-School columns to Profiles
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id),
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES public.academic_years(id),
ADD COLUMN IF NOT EXISTS student_id_display TEXT,
ADD COLUMN IF NOT EXISTS qr_code_data TEXT;

-- 5. Add Multi-School columns to Books
ALTER TABLE public.books 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

-- 6. Add School ID to User Roles to make roles school-specific
ALTER TABLE public.user_roles 
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES public.schools(id);

-- 7. Assign existing data to MABDC as a default starting point
DO $$
DECLARE
    mabdc_id UUID;
    ay_id UUID;
BEGIN
    SELECT id INTO mabdc_id FROM public.schools WHERE short_name = 'MABDC' LIMIT 1;
    SELECT id INTO ay_id FROM public.academic_years WHERE label = '2026-2027' LIMIT 1;

    IF mabdc_id IS NOT NULL THEN
        UPDATE public.profiles SET school_id = mabdc_id, academic_year_id = ay_id WHERE school_id IS NULL;
        UPDATE public.books SET school_id = mabdc_id WHERE school_id IS NULL;
        UPDATE public.user_roles SET school_id = mabdc_id WHERE school_id IS NULL;
    END IF;
END $$;

-- 8. Update handle_new_user trigger to associate with a default school (MABDC)
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
DECLARE
    mabdc_id UUID;
    ay_id UUID;
BEGIN
  SELECT id INTO mabdc_id FROM public.schools WHERE short_name = 'MABDC' LIMIT 1;
  SELECT id INTO ay_id FROM public.academic_years WHERE is_active = TRUE LIMIT 1;

  INSERT INTO public.profiles (id, name, grade_level, email, school_id, academic_year_id)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'name', NEW.email),
    COALESCE((NEW.raw_user_meta_data->>'grade_level')::int, 1),
    NEW.email,
    mabdc_id,
    ay_id
  );
  
  INSERT INTO public.user_roles (user_id, role, school_id)
  VALUES (NEW.id, 'student', mabdc_id);
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- 9. Update RLS Policies for School Isolation

-- Profiles
DROP POLICY IF EXISTS "Profiles visibility" ON public.profiles;
DROP POLICY IF EXISTS "Profiles update" ON public.profiles;
DROP POLICY IF EXISTS "Profiles school isolation" ON public.profiles;

CREATE POLICY "Profiles school isolation" ON public.profiles 
FOR SELECT TO authenticated 
USING (
    id = auth.uid() 
    OR (
        public.is_admin(auth.uid()) 
        AND school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    )
);

CREATE POLICY "Profiles update school isolation" ON public.profiles 
FOR UPDATE TO authenticated 
USING (
    id = auth.uid() 
    OR (
        public.is_admin(auth.uid()) 
        AND school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- Books
DROP POLICY IF EXISTS "Books visibility" ON public.books;
DROP POLICY IF EXISTS "Books school isolation" ON public.books;

CREATE POLICY "Books school isolation" ON public.books 
FOR SELECT TO authenticated 
USING (
    school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    AND (
        public.is_privileged(auth.uid()) 
        OR (
            status = 'ready' 
            AND grade_level = (SELECT grade_level FROM public.profiles WHERE id = auth.uid())
            AND NOT is_teacher_only
        )
    )
);

-- Roles
DROP POLICY IF EXISTS "Roles visibility" ON public.user_roles;
DROP POLICY IF EXISTS "Roles school isolation" ON public.user_roles;

CREATE POLICY "Roles school isolation" ON public.user_roles 
FOR SELECT TO authenticated 
USING (
    user_id = auth.uid() 
    OR (
        public.is_admin(auth.uid()) 
        AND school_id = (SELECT school_id FROM public.profiles WHERE id = auth.uid())
    )
);

-- 10. Student ID Generation Logic
CREATE OR REPLACE FUNCTION public.generate_student_id()
RETURNS TRIGGER AS $$
DECLARE
    school_prefix TEXT;
    year_prefix TEXT;
    next_num INT;
    new_id TEXT;
BEGIN
    -- Only generate if school and year are present and display ID is empty
    IF NEW.school_id IS NULL OR NEW.academic_year_id IS NULL OR NEW.student_id_display IS NOT NULL THEN
        RETURN NEW;
    END IF;

    -- Get school short name (e.g. MABDC)
    SELECT short_name INTO school_prefix FROM public.schools WHERE id = NEW.school_id;
    
    -- Get year (e.g. 2026)
    SELECT left(label, 4) INTO year_prefix FROM public.academic_years WHERE id = NEW.academic_year_id;
    
    -- Count existing students for this school in this year to get next number
    -- Simplified for small scale; consider sequences for high-concurrency
    SELECT count(*) + 1 INTO next_num 
    FROM public.profiles 
    WHERE school_id = NEW.school_id 
      AND academic_year_id = NEW.academic_year_id;
      
    -- Format: PREFIX-YYYY-001
    new_id := COALESCE(school_prefix, 'STUDENT') || '-' || COALESCE(year_prefix, to_char(now(), 'YYYY')) || '-' || LPAD(next_num::text, 3, '0');
    
    NEW.student_id_display := new_id;
    NEW.qr_code_data := new_id; -- Use the ID as the QR data by default
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trigger_generate_student_id ON public.profiles;
CREATE TRIGGER trigger_generate_student_id
BEFORE INSERT ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.generate_student_id();
