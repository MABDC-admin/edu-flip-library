-- Complete Grade 7 Student Creation for MABDC - All 36 Students
-- Run this in your Supabase SQL Editor

DO $$
DECLARE
    v_school_id UUID;
    v_academic_year_id UUID;
    v_user_id UUID;
    student_email TEXT;
    student_name TEXT;
    success_count INTEGER := 0;
    fail_count INTEGER := 0;
    
    -- All 36 Grade 7 students
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
        'g7rotugal@gmail.com|Rotugal',
        'g7sanjose@gmail.com|Sanjose',
        'g7tomenio@gmail.com|Tomenio',
        'g7treyes@gmail.com|Treyes',
        'g7valmadrid@gmail.com|Valmadrid',
        'g7alarcon@gmail.com|Alarcon',
        'g7arandid@gmail.com|Arandid',
        'g7avery@gmail.com|Avery',
        'g7baldove@gmail.com|Baldove',
        'g7baltazar@gmail.com|Baltazar',
        'g7cabarlo@gmail.com|Cabarlo',
        'g7cagampang@gmail.com|Cagampang',
        'g7cayabab@gmail.com|Cayabab',
        'g7chua@gmail.com|Chua',
        'g7enrile@gmail.com|Enrile',
        'g7epino@gmail.com|Epino',
        'g7flores@gmail.com|Flores',
        'g7gian@gmail.com|Gian',
        'g7ituralde@gmail.com|Ituralde',
        'g7liam@gmail.com|Liam',
        'g7magday@gmail.com|Magday',
        'g7mallari@gmail.com|Mallari',
        'g7manago@gmail.com|Manago',
        'g7mercado@gmail.com|Mercado',
        'g7mikel@gmail.com|Mikel',
        'g7mondia@gmail.com|Mondia',
        'g7muhammad@gmail.com|Muhammad'
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
    
    RAISE NOTICE 'Starting creation of all 36 Grade 7 students for MABDC';
    RAISE NOTICE 'School ID: %, Academic Year ID: %', v_school_id, v_academic_year_id;
    
    -- Process each student
    FOR i IN 1..36 LOOP
        BEGIN
            -- Parse student data
            student_email := split_part(students_data[i], '|', 1);
            student_name := split_part(students_data[i], '|', 2);
            
            -- Check if user already exists
            SELECT id INTO v_user_id FROM auth.users WHERE email = student_email;
            IF v_user_id IS NOT NULL THEN
                RAISE NOTICE '⚠ User % already exists, skipping', student_email;
                CONTINUE;
            END IF;
            
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
    
    RAISE NOTICE '=== FINAL CREATION SUMMARY ===';
    RAISE NOTICE 'Successfully created: % students', success_count;
    RAISE NOTICE 'Failed: % students', fail_count;
    RAISE NOTICE 'Total book assignments: %', 
        (SELECT COUNT(*) FROM user_assigned_books WHERE user_id IN (SELECT id FROM profiles WHERE grade_level = 7 AND school_id = v_school_id));
        
END $$;