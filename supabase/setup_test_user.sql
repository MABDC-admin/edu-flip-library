-- Helper SQL to initialize local testing environment
-- Run this in your Supabase SQL Editor: https://supabase.com/dashboard/project/kpzpuiiagtwajyrfmuzl/sql

-- 1. Manually confirm a user (if email verification is stuck)
UPDATE auth.users 
SET email_confirmed_at = NOW(), 
    last_sign_in_at = NOW()
WHERE email = 'sottodennis@gmail.com';

-- 2. Ensure the user has a profile record
INSERT INTO public.profiles (id, name, grade_level)
SELECT id, 'Admin User', 12 
FROM auth.users 
WHERE email = 'sottodennis@gmail.com'
ON CONFLICT (id) DO UPDATE SET 
    name = EXCLUDED.name,
    grade_level = EXCLUDED.grade_level;

-- 3. Assign the Admin role
-- The unique constraint is on (user_id, role)
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' 
FROM auth.users 
WHERE email = 'sottodennis@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
