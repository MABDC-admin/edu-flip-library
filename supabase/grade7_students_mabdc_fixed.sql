-- Fixed Grade 7 Students Creation Script for MABDC
-- Run this in your Supabase SQL Editor

-- Get MABDC school ID and current academic year
DO $$
DECLARE
    v_school_id UUID;
    v_academic_year_id UUID;
BEGIN
    SELECT id INTO v_school_id FROM schools WHERE slug = 'mabdc';
    SELECT id INTO v_academic_year_id FROM academic_years WHERE is_active = true ORDER BY created_at DESC LIMIT 1;
    
    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'MABDC school not found';
    END IF;
    
    IF v_academic_year_id IS NULL THEN
        RAISE EXCEPTION 'No active academic year found';
    END IF;
    
    RAISE NOTICE 'School ID: %', v_school_id;
    RAISE NOTICE 'Academic Year ID: %', v_academic_year_id;
END $$;

-- Create the function to create all Grade 7 students
CREATE OR REPLACE FUNCTION create_grade7_students()
RETURNS void AS $$
DECLARE
    student_emails TEXT[] := ARRAY[
        'g7nieva@gmail.com', 'g7nitura@gmail.com', 'g7olete@gmail.com', 'g7paular@gmail.com',
        'g7pelotera@gmail.com', 'g7punsalang@gmail.com', 'g7quenio@gmail.com', 'g7ramos@gmail.com',
        'g7rodelas@gmail.com', 'g7rotugal@gmail.com', 'g7sanjose@gmail.com', 'g7tomenio@gmail.com',
        'g7treyes@gmail.com', 'g7valmadrid@gmail.com', 'g7alarcon@gmail.com', 'g7arandid@gmail.com',
        'g7avery@gmail.com', 'g7baldove@gmail.com', 'g7baltazar@gmail.com', 'g7cabarlo@gmail.com',
        'g7cagampang@gmail.com', 'g7cayabab@gmail.com', 'g7chua@gmail.com', 'g7enrile@gmail.com',
        'g7epino@gmail.com', 'g7flores@gmail.com', 'g7gian@gmail.com', 'g7ituralde@gmail.com',
        'g7liam@gmail.com', 'g7magday@gmail.com', 'g7mallari@gmail.com', 'g7manago@gmail.com',
        'g7mercado@gmail.com', 'g7mikel@gmail.com', 'g7mondia@gmail.com', 'g7muhammad@gmail.com'
    ];
    student_names TEXT[] := ARRAY[
        'Nieva', 'Nitura', 'Olete', 'Paular', 'Pelotera', 'Punsalang', 'Quenio', 'Ramos',
        'Rodelas', 'Rotugal', 'Sanjose', 'Tomenio', 'Treyes', 'Valmadrid', 'Alarcon', 'Arandid',
        'Avery', 'Baldove', 'Baltazar', 'Cabarlo', 'Cagampang', 'Cayabab', 'Chua', 'Enrile',
        'Epino', 'Flores', 'Gian', 'Ituralde', 'Liam', 'Magday', 'Mallari', 'Manago',
        'Mercado', 'Mikel', 'Mondia', 'Muhammad'
    ];
    v_school_id UUID;
    v_academic_year_id UUID;
    v_user_id UUID;
    i INTEGER;
BEGIN
    -- Get school and academic year
    SELECT id INTO v_school_id FROM schools WHERE slug = 'mabdc';
    SELECT id INTO v_academic_year_id FROM academic_years WHERE is_active = true ORDER BY created_at DESC LIMIT 1;
    
    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'MABDC school not found';
    END IF;
    
    IF v_academic_year_id IS NULL THEN
        RAISE EXCEPTION 'No active academic year found';
    END IF;
    
    -- Create each student
    FOR i IN 1..36 LOOP
        -- Create auth user
        INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
        VALUES (student_emails[i], crypt('123456', gen_salt('bf')), now(), 
                '{"provider":"email","providers":["email"]}', 
                format('{"name":"Grade 7 %s Student","grade_level":7}', student_names[i]), 
                now(), now())
        RETURNING id INTO v_user_id;
        
        -- Create profile
        INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
        VALUES (v_user_id, format('Grade 7 %s Student', student_names[i]), student_emails[i], 7, v_school_id, v_academic_year_id);
        
        -- Assign role
        INSERT INTO user_roles (user_id, role, school_id)
        VALUES (v_user_id, 'student', v_school_id);
        
        -- Assign all Grade 7 books
        INSERT INTO user_assigned_books (user_id, book_id)
        SELECT v_user_id, id 
        FROM books 
        WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
        
        RAISE NOTICE 'Created student: % with % books assigned', student_emails[i], 
            (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);
    END LOOP;
    
    RAISE NOTICE '=== ALL 36 GRADE 7 STUDENTS CREATED SUCCESSFULLY ===';
    RAISE NOTICE 'Total book assignments: %', 
        (SELECT COUNT(*) FROM user_assigned_books WHERE user_id IN (SELECT id FROM profiles WHERE grade_level = 7 AND school_id = v_school_id));
END;
$$ LANGUAGE plpgsql;

-- To execute: SELECT create_grade7_students();