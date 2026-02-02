-- Phase 4: School Management Modules (Teachers, Classes, Grades)

-- 1. Sections (Advisory Classes)
CREATE TABLE IF NOT EXISTS public.sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id),
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
    grade_level INTEGER NOT NULL,
    name TEXT NOT NULL, -- e.g. "Rizal"
    adviser_id UUID REFERENCES public.profiles(id), -- Teacher
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_section_per_school_year UNIQUE(school_id, academic_year_id, grade_level, name)
);

-- 2. Subjects (Curriculum)
CREATE TABLE IF NOT EXISTS public.subjects (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id),
    grade_level INTEGER NOT NULL,
    name TEXT NOT NULL, -- e.g. "Mathematics"
    code TEXT, -- e.g. "MATH10"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_subject_per_school_grade UNIQUE(school_id, grade_level, name)
);

-- 3. Classes (Subject Classes - Intersection of Section + Subject)
CREATE TABLE IF NOT EXISTS public.classes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id),
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
    section_id UUID NOT NULL REFERENCES public.sections(id),
    subject_id UUID NOT NULL REFERENCES public.subjects(id),
    teacher_id UUID REFERENCES public.profiles(id),
    schedule TEXT, -- e.g. "MWF 9:00-10:00"
    room TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Student Sections (Enrollment in a Section)
CREATE TABLE IF NOT EXISTS public.student_sections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id),
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    section_id UUID NOT NULL REFERENCES public.sections(id),
    created_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_student_section_per_year UNIQUE(school_id, academic_year_id, student_id)
);

-- 5. Grades (DepEd Standard)
CREATE TABLE IF NOT EXISTS public.grades (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    school_id UUID NOT NULL REFERENCES public.schools(id),
    academic_year_id UUID NOT NULL REFERENCES public.academic_years(id),
    class_id UUID NOT NULL REFERENCES public.classes(id),
    student_id UUID NOT NULL REFERENCES public.profiles(id),
    quarter INTEGER NOT NULL CHECK (quarter BETWEEN 1 AND 4),
    
    -- Components (Stored as JSON for flexibility or separate columns)
    -- DepEd usually has distinct components per subject type (Languages/Sciences/Math vs MAPEH etc)
    -- We'll store the summary scores here
    written_works_score FLOAT DEFAULT 0,
    written_works_total FLOAT DEFAULT 0,
    performance_tasks_score FLOAT DEFAULT 0,
    performance_tasks_total FLOAT DEFAULT 0,
    quarterly_assessment_score FLOAT DEFAULT 0,
    quarterly_assessment_total FLOAT DEFAULT 0,
    
    initial_grade FLOAT, -- The raw computation (e.g. 84.5)
    transmuted_grade INTEGER, -- The final grade on card (e.g. 85)
    
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW(),
    CONSTRAINT unique_grade_entry UNIQUE(class_id, student_id, quarter)
);

-- 6. Enable RLS
ALTER TABLE public.sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subjects ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.classes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.student_sections ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.grades ENABLE ROW LEVEL SECURITY;

-- 7. RLS Policies (School Isolation)

-- Sections
CREATE POLICY "Sections visibility" ON public.sections
    FOR ALL USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- Subjects
CREATE POLICY "Subjects visibility" ON public.subjects
    FOR ALL USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- Classes
CREATE POLICY "Classes visibility" ON public.classes
    FOR ALL USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- Student Sections
CREATE POLICY "Student Sections visibility" ON public.student_sections
    FOR ALL USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));

-- Grades
CREATE POLICY "Grades visibility" ON public.grades
    FOR ALL USING (school_id IN (SELECT school_id FROM public.profiles WHERE id = auth.uid()));
