-- Robust Grade 7 Student Creation with Error Handling
-- This version will continue even if some students fail

DO $$
DECLARE
    v_school_id UUID;
    v_academic_year_id UUID;
    v_user_id UUID;
    student_email TEXT;
    student_name TEXT;
    success_count INTEGER := 0;
    fail_count INTEGER := 0;
    
    -- Student data
    students_data TEXT[] := ARRAY[
        'g7nieva@gmail.com|Nieva',
        'g7nitura@gmail.com|Nitura', 
        'g7olete@gmail.com|Olete',
        'g7paular@gmail.com|Paular',
        'g7pelotera@gmail.com|Pelotera',
        'g7punsalang@gmail.com|Punsalang',
        'g7quenio@gmail.com|Quenio',
        'g7ramos@gmail.com|Ramos',
        'g7rodelas@gmail.com|Rodelas',
        'g7rotugal@gmail.com|Rotugal'
        -- Add remaining 26 students here
    ];
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
    
    RAISE NOTICE 'Starting student creation for MABDC Grade 7';
    RAISE NOTICE 'School ID: %, Academic Year ID: %', v_school_id, v_academic_year_id;
    
    -- Process each student
    FOR i IN 1..10 LOOP -- Start with first 10 for testing
        BEGIN
            -- Parse student data
            student_email := split_part(students_data[i], '|', 1);
            student_name := split_part(students_data[i], '|', 2);
            
            -- Create auth user
            INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
            VALUES (student_email, crypt('123456', gen_salt('bf')), now(), 
                    '{"provider":"email","providers":["email"]}', 
                    format('{"name":"Grade 7 %s Student","grade_level":7}', student_name), 
                    now(), now())
            RETURNING id INTO v_user_id;
            
            -- Create profile
            INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
            VALUES (v_user_id, format('Grade 7 %s Student', student_name), student_email, 7, v_school_id, v_academic_year_id);
            
            -- Assign role
            INSERT INTO user_roles (user_id, role, school_id)
            VALUES (v_user_id, 'student', v_school_id);
            
            -- Assign books
            INSERT INTO user_assigned_books (user_id, book_id)
            SELECT v_user_id, id FROM books 
            WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
            
            success_count := success_count + 1;
            RAISE NOTICE '✓ Created % with % books', student_email, 
                (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);
                
        EXCEPTION WHEN OTHERS THEN
            fail_count := fail_count + 1;
            RAISE NOTICE '✗ Failed to create %: %', student_email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '=== CREATION SUMMARY ===';
    RAISE NOTICE 'Successful: % students', success_count;
    RAISE NOTICE 'Failed: % students', fail_count;
    RAISE NOTICE 'Total book assignments: %', 
        (SELECT COUNT(*) FROM user_assigned_books WHERE user_id IN (SELECT id FROM profiles WHERE grade_level = 7 AND school_id = v_school_id));
        
END $$;