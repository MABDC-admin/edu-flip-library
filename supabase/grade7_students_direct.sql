-- Simple Direct Student Creation for MABDC Grade 7
-- Run each block separately in Supabase SQL Editor

-- First, get your school and academic year IDs
-- Run this first to verify:
SELECT 
    (SELECT id FROM schools WHERE slug = 'mabdc') as school_id,
    (SELECT id FROM academic_years WHERE is_active = true ORDER BY created_at DESC LIMIT 1) as academic_year_id;

-- Then run this block for each student (replace email and name):
-- Student 1
DO $$
DECLARE
    v_school_id UUID := (SELECT id FROM schools WHERE slug = 'mabdc');
    v_academic_year_id UUID := (SELECT id FROM academic_years WHERE is_active = true ORDER BY created_at DESC LIMIT 1);
    v_user_id UUID;
BEGIN
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7nieva@gmail.com', crypt('123456', gen_salt('bf')), now(), 
            '{"provider":"email","providers":["email"]}', 
            '{"name":"Grade 7 Nieva Student","grade_level":7}', 
            now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Nieva Student', 'g7nieva@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created: g7nieva@gmail.com with % books', 
        (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);
END $$;

-- Student 2
DO $$
DECLARE
    v_school_id UUID := (SELECT id FROM schools WHERE slug = 'mabdc');
    v_academic_year_id UUID := (SELECT id FROM academic_years WHERE is_active = true ORDER BY created_at DESC LIMIT 1);
    v_user_id UUID;
BEGIN
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7nitura@gmail.com', crypt('123456', gen_salt('bf')), now(), 
            '{"provider":"email","providers":["email"]}', 
            '{"name":"Grade 7 Nitura Student","grade_level":7}', 
            now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Nitura Student', 'g7nitura@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created: g7nitura@gmail.com with % books', 
        (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);
END $$;

-- Continue with remaining students...
-- You can copy the above block and change the email and name for each student