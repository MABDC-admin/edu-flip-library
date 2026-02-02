-- Seed Data for Schools and Academic Years

-- 1. Insert Schools
INSERT INTO public.schools (name, short_name, slug, logo_url)
VALUES 
('M.A Brain Development Center', 'MABDC', 'mabdc', '/mabdc-logo.png'),
('St. Francis Xavier Smart Academy Inc.', 'SFXSAI', 'sfxsai', '/sfxsai-logo.png')
ON CONFLICT (slug) DO UPDATE SET 
    name = EXCLUDED.name,
    short_name = EXCLUDED.short_name,
    logo_url = EXCLUDED.logo_url;

-- 2. Insert Academic Year
INSERT INTO public.academic_years (label, start_date, end_date, is_active)
VALUES 
('2026-2027', '2026-06-01', '2027-03-31', true)
ON CONFLICT DO NOTHING; -- No unique constraint on label in my migration, but good habit
