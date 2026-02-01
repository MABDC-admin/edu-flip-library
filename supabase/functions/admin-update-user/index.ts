import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.21.0";

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        // Extract and validate Authorization header
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

        // 1. Check if the user calling this function is an ADMIN
        // CRITICAL: Pass token explicitly when verify_jwt=false (required for Lovable Cloud)
        const {
            data: { user },
            error: authError,
        } = await supabaseClient.auth.getUser(token);

        if (authError || !user) {
            console.error('Auth error:', authError);
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

        // 2. Initialize Service Role Client (for admin updates)
        const supabaseAdmin = createClient(
            Deno.env.get('SUPABASE_URL') ?? '',
            Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
        );

        const { userId, newPassword, newName } = await req.json();

        if (!userId) throw new Error('User ID is required');

        const updates: any = {};
        if (newPassword) updates.password = newPassword;
        if (newName) updates.user_metadata = { name: newName };

        if (Object.keys(updates).length === 0) {
            return new Response(JSON.stringify({ message: 'No updates provided' }), {
                headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            });
        }

        // 3. Update the user
        const { data: updatedUser, error: updateError } = await supabaseAdmin.auth.admin.updateUserById(
            userId,
            updates
        );

        if (updateError) throw updateError;

        // 4. Also update public profile if name changed
        if (newName) {
            await supabaseAdmin.from('profiles').update({ name: newName }).eq('id', userId);
        }

        return new Response(JSON.stringify({ user: updatedUser, message: 'User updated successfully' }), {
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
