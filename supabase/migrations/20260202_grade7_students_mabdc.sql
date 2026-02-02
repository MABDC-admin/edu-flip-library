-- Grade 7 Students Creation and Book Assignment for MABDC
-- This script creates 36 Grade 7 students and assigns all Grade 7 books to them

-- First, get the MABDC school ID and current academic year
DO $$
DECLARE
    v_school_id UUID;
    v_academic_year_id UUID;
    v_student_role_id UUID;
    v_user_id UUID;
    v_book_id UUID;
BEGIN
    -- Get MABDC school ID
    SELECT id INTO v_school_id 
    FROM schools 
    WHERE slug = 'mabdc';
    
    IF v_school_id IS NULL THEN
        RAISE EXCEPTION 'MABDC school not found';
    END IF;
    
    -- Get current active academic year for MABDC
    SELECT id INTO v_academic_year_id
    FROM academic_years
    WHERE school_id = v_school_id AND is_active = true
    ORDER BY created_at DESC
    LIMIT 1;
    
    IF v_academic_year_id IS NULL THEN
        RAISE EXCEPTION 'No active academic year found for MABDC';
    END IF;
    
    -- Get student role ID (assuming it exists)
    SELECT id INTO v_student_role_id
    FROM user_roles
    WHERE role = 'student' AND school_id = v_school_id
    LIMIT 1;
    
    RAISE NOTICE 'School ID: %', v_school_id;
    RAISE NOTICE 'Academic Year ID: %', v_academic_year_id;

    -- Create students and assign books
    -- Student 1: g7nieva@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7nieva@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Nieva Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Nieva Student', 'g7nieva@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    -- Assign all Grade 7 books to this student
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7nieva@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 2: g7nitura@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7nitura@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Nitura Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Nitura Student', 'g7nitura@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7nitura@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 3: g7olete@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7olete@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Olete Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Olete Student', 'g7olete@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7olete@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 4: g7paular@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7paular@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Paular Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Paular Student', 'g7paular@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7paular@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 5: g7pelotera@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7pelotera@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Pelotera Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Pelotera Student', 'g7pelotera@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7pelotera@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 6: g7punsalang@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7punsalang@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Punsalang Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Punsalang Student', 'g7punsalang@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7punsalang@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 7: g7quenio@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7quenio@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Quenio Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Quenio Student', 'g7quenio@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7quenio@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 8: g7ramos@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7ramos@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Ramos Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Ramos Student', 'g7ramos@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7ramos@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 9: g7rodelas@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7rodelas@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Rodelas Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Rodelas Student', 'g7rodelas@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7rodelas@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 10: g7rotugal@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7rotugal@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Rotugal Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Rotugal Student', 'g7rotugal@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7rotugal@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 11: g7sanjose@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7sanjose@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Sanjose Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Sanjose Student', 'g7sanjose@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7sanjose@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 12: g7tomenio@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7tomenio@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Tomenio Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Tomenio Student', 'g7tomenio@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7tomenio@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 13: g7treyes@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7treyes@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Treyes Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Treyes Student', 'g7treyes@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7treyes@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 14: g7valmadrid@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7valmadrid@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Valmadrid Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Valmadrid Student', 'g7valmadrid@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7valmadrid@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 15: g7alarcon@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7alarcon@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Alarcon Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Alarcon Student', 'g7alarcon@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7alarcon@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 16: g7arandid@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7arandid@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Arandid Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Arandid Student', 'g7arandid@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7arandid@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 17: g7avery@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7avery@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Avery Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Avery Student', 'g7avery@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7avery@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 18: g7baldove@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7baldove@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Baldove Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Baldove Student', 'g7baldove@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7baldove@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 19: g7baltazar@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7baltazar@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Baltazar Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Baltazar Student', 'g7baltazar@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7baltazar@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 20: g7cabarlo@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7cabarlo@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Cabarlo Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Cabarlo Student', 'g7cabarlo@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7cabarlo@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 21: g7cagampang@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7cagampang@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Cagampang Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Cagampang Student', 'g7cagampang@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7cagampang@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 22: g7cayabab@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7cayabab@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Cayabab Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Cayabab Student', 'g7cayabab@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7cayabab@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 23: g7chua@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7chua@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Chua Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Chua Student', 'g7chua@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7chua@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 24: g7enrile@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7enrile@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Enrile Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Enrile Student', 'g7enrile@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7enrile@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 25: g7epino@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7epino@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Epino Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Epino Student', 'g7epino@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7epino@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 26: g7flores@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7flores@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Flores Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Flores Student', 'g7flores@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7flores@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 27: g7gian@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7gian@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Gian Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Gian Student', 'g7gian@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7gian@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 28: g7ituralde@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7ituralde@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Ituralde Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Ituralde Student', 'g7ituralde@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7ituralde@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 29: g7liam@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7liam@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Liam Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Liam Student', 'g7liam@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7liam@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 30: g7magday@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7magday@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Magday Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Magday Student', 'g7magday@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7magday@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 31: g7mallari@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7mallari@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Mallari Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Mallari Student', 'g7mallari@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7mallari@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 32: g7manago@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7manago@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Manago Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Manago Student', 'g7manago@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7manago@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 33: g7mercado@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7mercado@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Mercado Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Mercado Student', 'g7mercado@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7mercado@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 34: g7mikel@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7mikel@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Mikel Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Mikel Student', 'g7mikel@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7mikel@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 35: g7mondia@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7mondia@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Mondia Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Mondia Student', 'g7mondia@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7mondia@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Student 36: g7muhammad@gmail.com
    INSERT INTO auth.users (email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at)
    VALUES ('g7muhammad@gmail.com', crypt('123456', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"name":"Grade 7 Muhammad Student","grade_level":7}', now(), now())
    RETURNING id INTO v_user_id;
    
    INSERT INTO profiles (id, name, email, grade_level, school_id, academic_year_id)
    VALUES (v_user_id, 'Grade 7 Muhammad Student', 'g7muhammad@gmail.com', 7, v_school_id, v_academic_year_id);
    
    INSERT INTO user_roles (user_id, role, school_id)
    VALUES (v_user_id, 'student', v_school_id);
    
    INSERT INTO user_assigned_books (user_id, book_id)
    SELECT v_user_id, id 
    FROM books 
    WHERE grade_level = 7 AND status = 'ready' AND school_id = v_school_id;
    
    RAISE NOTICE 'Created student: g7muhammad@gmail.com with % books assigned', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id = v_user_id);

    -- Final summary
    RAISE NOTICE '=== GRADE 7 STUDENT CREATION COMPLETE ===';
    RAISE NOTICE 'Total students created: 36';
    RAISE NOTICE 'Total book assignments: %', (SELECT COUNT(*) FROM user_assigned_books WHERE user_id IN (SELECT id FROM profiles WHERE grade_level = 7 AND school_id = v_school_id));

END $$;