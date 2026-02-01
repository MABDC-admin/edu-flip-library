-- FORCE creating a user if they don't exist (Password will be 'password123')
-- Run this in Supabase SQL Editor

-- 1. Create the user manually in auth.users
INSERT INTO auth.users (
  instance_id,
  id,
  aud,
  role,
  email,
  encrypted_password,
  email_confirmed_at,
  recovery_sent_at,
  last_sign_in_at,
  raw_app_meta_data,
  raw_user_meta_data,
  created_at,
  updated_at,
  confirmation_token,
  email_change,
  email_change_token_new,
  recovery_token
) VALUES (
  '00000000-0000-0000-0000-000000000000',
  gen_random_uuid(),
  'authenticated',
  'authenticated',
  'sottodennis@gmail.com',
  crypt('password123', gen_salt('bf')), -- Default password
  NOW(),
  NULL,
  NOW(),
  '{"provider":"email","providers":["email"]}',
  '{"name":"Admin User","grade_level":12}',
  NOW(),
  NOW(),
  '',
  '',
  '',
  ''
)
ON CONFLICT (email) DO UPDATE SET 
  email_confirmed_at = NOW(),
  encrypted_password = EXCLUDED.encrypted_password; -- RESET PASSWORD TO 'password123'

-- 2. Ensure Profile exists
INSERT INTO public.profiles (id, name, grade_level)
SELECT id, 'Admin User', 12 
FROM auth.users 
WHERE email = 'sottodennis@gmail.com'
ON CONFLICT (id) DO NOTHING;

-- 3. Make Admin
INSERT INTO public.user_roles (user_id, role)
SELECT id, 'admin' 
FROM auth.users 
WHERE email = 'sottodennis@gmail.com'
ON CONFLICT (user_id, role) DO NOTHING;
