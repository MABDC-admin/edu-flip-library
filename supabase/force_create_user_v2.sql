-- FORCE creating a user if they don't exist (Password will be 'password123')
-- Run this in Supabase SQL Editor

DO $$
DECLARE
  v_user_id UUID;
BEGIN
  -- 1. Try to find the user first
  SELECT id INTO v_user_id FROM auth.users WHERE email = 'sottodennis@gmail.com';

  -- 2. If user exists, update password and confirm
  IF v_user_id IS NOT NULL THEN
    UPDATE auth.users 
    SET encrypted_password = crypt('password123', gen_salt('bf')),
        email_confirmed_at = NOW(),
        last_sign_in_at = NOW()
    WHERE id = v_user_id;
    
  -- 3. If user does NOT exist, create them
  ELSE
    v_user_id := gen_random_uuid();
    
    INSERT INTO auth.users (
      instance_id, id, aud, role, email, encrypted_password, email_confirmed_at,
      last_sign_in_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at
    ) VALUES (
      '00000000-0000-0000-0000-000000000000', v_user_id, 'authenticated', 'authenticated',
      'sottodennis@gmail.com', crypt('password123', gen_salt('bf')), NOW(),
      NOW(), '{"provider":"email","providers":["email"]}', '{"name":"Admin User"}', NOW(), NOW()
    );
  END IF;

  -- 4. Ensure Profile exists
  INSERT INTO public.profiles (id, name, grade_level)
  VALUES (v_user_id, 'Admin User', 12)
  ON CONFLICT (id) DO NOTHING;

  -- 5. Make Admin (Correctly handling composite key)
  INSERT INTO public.user_roles (user_id, role)
  VALUES (v_user_id, 'admin')
  ON CONFLICT (user_id, role) DO NOTHING;
  
END $$;
