-- Grade 8 Students Creation Script for MABDC
-- Run this in Supabase SQL Editor with service_role access
-- School ID: 15f61d03-8aa8-422a-9faa-afbc8099adce
-- Academic Year ID: 07d916be-d44f-426f-853d-260bb38e4208

DO $$
DECLARE
    v_school_id UUID := '15f61d03-8aa8-422a-9faa-afbc8099adce';
    v_academic_year_id UUID := '07d916be-d44f-426f-853d-260bb38e4208';
    v_user_id UUID;
    success_count INTEGER := 0;
    fail_count INTEGER := 0;
    
    students_data TEXT[] := ARRAY[
        'g8alifdeen@gmail.com|Alifdeen',
        'g8cabantoc@gmail.com|Cabantoc',
        'g8butt@gmail.com|Butt',
        'g8pilon@gmail.com|Pilon',
        'g8peng@gmail.com|Peng',
        'g8verano@gmail.com|Verano',
        'g8magnaye@gmail.com|Magnaye',
        'g8tor@gmail.com|Tor',
        'g8layson@gmail.com|Layson',
        'g8dayangco@gmail.com|Dayangco',
        'g8tandog@gmail.com|Tandog',
        'g8tagulao@gmail.com|Tagulao',
        'g8ceres@gmail.com|Ceres',
        'g8delacruz@gmail.com|Dela Cruz',
        'g8cagampang@gmail.com|Cagampang',
        'g8foja@gmail.com|Foja',
        'g8guijo@gmail.com|Guijo',
        'g8vista@gmail.com|Vista',
        'g8mamauag@gmail.com|Mamauag',
        'g8daguio@gmail.com|Daguio',
        'g8amurao@gmail.com|Amurao',
        'g8garcia@gmail.com|Garcia',
        'g8elegido@gmail.com|Elegido',
        'g8modelo@gmail.com|Modelo',
        'g8gomorera@gmail.com|Gomorera',
        'g8cruzat@gmail.com|Cruzat',
        'g8claudio@gmail.com|Claudio',
        'g8delosangeles@gmail.com|De Los Angeles',
        'g8anosa@gmail.com|Anosa',
        'g8pugeda@gmail.com|Pugeda',
        'g8sayas@gmail.com|Sayas',
        'g8montemayor@gmail.com|Montemayor',
        'g8manacsa@gmail.com|Manacsa',
        'g8villar@gmail.com|Villar'
    ];
    student_email TEXT;
    student_name TEXT;
BEGIN
    RAISE NOTICE 'Starting Grade 8 student creation for MABDC';
    RAISE NOTICE 'School ID: %, Academic Year ID: %', v_school_id, v_academic_year_id;
    
    FOR i IN 1..34 LOOP
        BEGIN
            student_email := split_part(students_data[i], '|', 1);
            student_name := split_part(students_data[i], '|', 2);
            
            -- Create auth user
            INSERT INTO auth.users (
                instance_id,
                email, 
                encrypted_password, 
                email_confirmed_at, 
                raw_app_meta_data, 
                raw_user_meta_data, 
                created_at, 
                updated_at,
                aud,
                role
            )
            VALUES (
                '00000000-0000-0000-0000-000000000000',
                student_email, 
                crypt('123456', gen_salt('bf')), 
                now(), 
                '{"provider":"email","providers":["email"]}', 
                format('{"name":"Grade 8 %s","grade_level":8}', student_name)::jsonb, 
                now(), 
                now(),
                'authenticated',
                'authenticated'
            )
            RETURNING id INTO v_user_id;
            
            -- Create profile
            INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
            VALUES (v_user_id, format('Grade 8 %s', student_name), student_email, 8, v_school_id, v_academic_year_id);
            
            -- Assign student role
            INSERT INTO user_roles (user_id, role, school_id)
            VALUES (v_user_id, 'student', v_school_id);
            
            -- Assign all Grade 8 books from MABDC
            INSERT INTO user_assigned_books (user_id, book_id)
            SELECT v_user_id, id FROM books 
            WHERE grade_level = 8 AND status = 'ready' AND school_id = v_school_id;
            
            success_count := success_count + 1;
            RAISE NOTICE '✓ Created: % (%)', student_email, student_name;
                
        EXCEPTION WHEN OTHERS THEN
            fail_count := fail_count + 1;
            RAISE NOTICE '✗ Failed: % - %', student_email, SQLERRM;
        END;
    END LOOP;
    
    RAISE NOTICE '=== CREATION COMPLETE ===';
    RAISE NOTICE 'Successful: % students', success_count;
    RAISE NOTICE 'Failed: % students', fail_count;
END $$;

-- Verify the created students
SELECT p.email, p.name, p.grade_level, 
       (SELECT COUNT(*) FROM user_assigned_books uab WHERE uab.user_id = p.id) as assigned_books
FROM profiles p
WHERE p.grade_level = 8 AND p.school_id = '15f61d03-8aa8-422a-9faa-afbc8099adce'
ORDER BY p.email;
