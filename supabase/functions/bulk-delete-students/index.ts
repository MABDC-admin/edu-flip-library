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

        const { user_ids } = await req.json() as { user_ids: string[] };

        if (!user_ids || !Array.isArray(user_ids)) {
            throw new Error('user_ids array is required');
        }

        console.log(`Attempting to delete ${user_ids.length} users`);

        const results = {
            success: [] as string[],
            failed: [] as { id: string; error: string }[],
        };

        for (const userId of user_ids) {
            try {
                const { error: deleteError } = await supabaseAdmin.auth.admin.deleteUser(userId);

                if (deleteError) throw deleteError;

                results.success.push(userId);
                console.log(`Successfully deleted user: ${userId}`);
            } catch (error) {
                console.error(`Failed to delete user ${userId}:`, error);
                results.failed.push({
                    id: userId,
                    error: error instanceof Error ? error.message : 'Unknown error',
                });
            }
        }

        return new Response(JSON.stringify({
            message: `Deleted ${results.success.length} users, ${results.failed.length} failed`,
            results,
        }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 200,
        });
    } catch (error: unknown) {
        const message = error instanceof Error ? error.message : 'An unknown error occurred';
        console.error('Bulk delete error:', message);
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' },
            status: 400,
        });
    }
});
