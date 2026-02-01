-- Script to assign teacher role to a user after they sign up
-- Run this after the user "teacher@mabdc.org" has signed up

-- First, find the user's ID
DO $$
DECLARE
    teacher_user_id UUID;
BEGIN
    -- Get the user ID for the teacher
    SELECT id INTO teacher_user_id
    FROM auth.users
    WHERE email = 'teacher@mabdc.org';
    
    IF teacher_user_id IS NULL THEN
        RAISE EXCEPTION 'User with email teacher@mabdc.org not found. Please sign up first.';
    END IF;
    
    -- Insert the teacher role (ignore if already exists)
    INSERT INTO public.user_roles (user_id, role)
    VALUES (teacher_user_id, 'teacher')
    ON CONFLICT (user_id) DO UPDATE SET role = 'teacher';
    
    -- Update the profile if it exists
    UPDATE public.profiles
    SET name = 'Teacher Account'
    WHERE id = teacher_user_id AND name IS NULL;
    
    RAISE NOTICE 'Successfully assigned teacher role to user %', teacher_user_id;
END $$;
