import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

interface StudentData {
    email: string;
    password: string;
    name: string;
    grade_level: number;
    school_id: string;
    academic_year_id: string;
}

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const authHeader = req.headers.get('Authorization');
        if (!authHeader?.startsWith('Bearer ')) {
            return new Response(JSON.stringify({ error: 'Not authenticated' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const token = authHeader.replace('Bearer ', '');

        const supabaseClient = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_ANON_KEY') ?? '',
            { global: { headers: { Authorization: authHeader } } }
        );

        // Verify caller is admin
        const { data: { user }, error: authError } = await supabaseClient.auth.getUser(token);

        if (authError || !user) {
            return new Response(JSON.stringify({ error: 'Not authenticated' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        const { data: roles } = await supabaseClient
            .from('user_roles')
            .select('role')
            .eq('user_id', user.id)
            .eq('role', 'admin')
            .single();

        if (!roles) {
            return new Response(JSON.stringify({ error: 'Unauthorized. Admin role required.' }), {
                status: 403,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // Initialize Service Role Client
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { students, auto_assign_books } = await req.json() as { 
            students: StudentData[], 
            auto_assign_books: boolean 
        };

        if (!students || !Array.isArray(students)) {
            throw new Error('Students array is required');
        }

        const results = {
            success: [] as string[],
            failed: [] as { email: string; error: string }[],
        };

        for (const student of students) {
            try {
                // Create auth user
                const { data: authData, error: createError } = await supabaseAdmin.auth.admin.createUser({
                    email: student.email,
                    password: student.password,
                    email_confirm: true,
                    user_metadata: {
                        name: student.name,
                        grade_level: student.grade_level,
                    },
                });

                if (createError) throw createError;

                const userId = authData.user.id;

                // Create profile
                const { error: profileError } = await supabaseAdmin
                    .from('profiles')
                    .upsert({
                        id: userId,
                        name: student.name,
                        email: student.email,
                        grade_level: student.grade_level,
                        school_id: student.school_id,
                        academic_year_id: student.academic_year_id,
                    });

                if (profileError) throw profileError;

                // Assign student role
                const { error: roleError } = await supabaseAdmin
                    .from('user_roles')
                    .upsert({
                        user_id: userId,
                        role: 'student',
                        school_id: student.school_id,
                    }, { onConflict: 'user_id,role' });

                if (roleError) throw roleError;

                // Auto-assign books if requested
                if (auto_assign_books) {
                    const { data: books } = await supabaseAdmin
                        .from('books')
                        .select('id')
                        .eq('grade_level', student.grade_level)
                        .eq('status', 'ready')
                        .eq('school_id', student.school_id);

                    if (books && books.length > 0) {
                        const assignments = books.map(book => ({
                            user_id: userId,
                            book_id: book.id,
                        }));

                        await supabaseAdmin
                            .from('user_assigned_books')
                            .upsert(assignments, { onConflict: 'user_id,book_id' });
                    }
                }

                results.success.push(student.email);
            } catch (error) {
                results.failed.push({
                    email: student.email,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return new Response(JSON.stringify({
            message: `Created ${results.success.length} students, ${results.failed.length} failed`,
            results,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
