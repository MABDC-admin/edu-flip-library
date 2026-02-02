-- Phase 3: Registrar & Attendance Integration Migration

-- 1. Ensure extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 2. Schools Table
CREATE TABLE IF NOT EXISTS public.schools (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    short_name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    logo_url TEXT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 3. Academic Years Table
CREATE TABLE IF NOT EXISTS public.academic_years (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    label TEXT NOT NULL,
    start_date DATE,
    end_date DATE,
    is_active BOOLEAN DEFAULT false,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Update Profiles Table for Student Metadata
ALTER TABLE public.profiles 
ADD COLUMN IF NOT EXISTS student_id TEXT,
ADD COLUMN IF NOT EXISTS school_id UUID REFERENCES schools(id),
ADD COLUMN IF NOT EXISTS academic_year_id UUID REFERENCES academic_years(id),
ADD COLUMN IF NOT EXISTS qr_code_data TEXT,
ADD COLUMN IF NOT EXISTS guardian_name TEXT,
ADD COLUMN IF NOT EXISTS guardian_contact TEXT,
ADD COLUMN IF NOT EXISTS address TEXT,
ADD COLUMN IF NOT EXISTS student_id_display TEXT,
ADD COLUMN IF NOT EXISTS uae_address JSONB;

-- 5. Student ID Sequences (to ensure MABDC-2026-XXX uniqueness)
CREATE TABLE IF NOT EXISTS public.student_id_sequences (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id),
    academic_year_id UUID REFERENCES academic_years(id),
    current_val INTEGER DEFAULT 0,
    UNIQUE(school_id, academic_year_id)
);

-- 6. Enrollments Table (Stores the form submissions)
CREATE TABLE IF NOT EXISTS public.enrollments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    school_id UUID REFERENCES schools(id),
    academic_year_id UUID REFERENCES academic_years(id),
    profile_id UUID REFERENCES profiles(id),
    status TEXT DEFAULT 'pending', -- pending, approved, rejected
    form_data JSONB NOT NULL,
    form_name TEXT NOT NULL, -- "Learner's Enrollment Form" vs "Student's Enrollment Form"
    created_at TIMESTAMPTZ DEFAULT NOW(),
    updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- 7. Attendance Logs Table
CREATE TABLE IF NOT EXISTS public.attendance_logs (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    profile_id UUID REFERENCES profiles(id),
    school_id UUID REFERENCES schools(id),
    academic_year_id UUID REFERENCES academic_years(id),
    check_in_time TIMESTAMPTZ DEFAULT NOW(),
    status TEXT DEFAULT 'present'
);

-- 8. Function to generate next Student ID
CREATE OR REPLACE FUNCTION generate_next_student_id(p_school_id UUID, p_academic_year_id UUID)
RETURNS TEXT AS $$
DECLARE
    v_prefix TEXT;
    v_year_label TEXT;
    v_seq INTEGER;
    v_final_id TEXT;
BEGIN
    -- Get prefix from school
    SELECT short_name INTO v_prefix FROM schools WHERE id = p_school_id;
    
    -- Get year from academic_years (take first 4 chars of label e.g. "2026")
    SELECT LEFT(label, 4) INTO v_year_label FROM academic_years WHERE id = p_academic_year_id;
    
    -- Increment sequence
    INSERT INTO student_id_sequences (school_id, academic_year_id, current_val)
    VALUES (p_school_id, p_academic_year_id, 1)
    ON CONFLICT (school_id, academic_year_id) 
    DO UPDATE SET current_val = student_id_sequences.current_val + 1
    RETURNING current_val INTO v_seq;
    
    -- Format: MABDC-2026-001
    v_final_id := v_prefix || '-' || v_year_label || '-' || LPAD(v_seq::TEXT, 3, '0');
    
    RETURN v_final_id;
END;
$$ LANGUAGE plpgsql;

-- 9. Basic RLS (Siloing)
ALTER TABLE public.enrollments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Admins can view their school's enrollments" ON public.enrollments
    FOR ALL USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));

CREATE POLICY "Admins can view their school's attendance" ON public.attendance_logs
    FOR ALL USING (school_id IN (SELECT school_id FROM profiles WHERE id = auth.uid()));
