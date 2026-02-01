import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { crypto } from "https://deno.land/std@0.168.0/crypto/mod.ts";
import { hex } from "https://deno.land/std@0.168.0/encoding/hex.ts";

declare const Deno: any;

const corsHeaders = {
    'Access-Control-Allow-Origin': '*',
    'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-hub-signature-256',
};

serve(async (req) => {
    // Handle CORS preflight
    if (req.method === 'OPTIONS') {
        return new Response('ok', { headers: corsHeaders });
    }

    try {
        const WEBHOOK_SECRET = Deno.env.get('GITHUB_WEBHOOK_SECRET');
        if (!WEBHOOK_SECRET) {
            throw new Error('GITHUB_WEBHOOK_SECRET is not set');
        }

        const signature = req.headers.get('x-hub-signature-256');
        if (!signature) {
            return new Response(JSON.stringify({ error: 'Missing signature' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const bodyText = await req.text();
        const encoder = new TextEncoder();

        // Verify HMAC SHA256 Signature
        const key = await crypto.subtle.importKey(
            "raw",
            encoder.encode(WEBHOOK_SECRET),
            { name: "HMAC", hash: "SHA-256" },
            false,
            ["verify", "sign"]
        );

        const sigHex = signature.replace('sha256=', '');
        const sigBytes = new Uint8Array(sigHex.match(/.{1,2}/g)!.map((byte: string) => parseInt(byte, 16)));

        const isValid = await crypto.subtle.verify(
            "HMAC",
            key,
            sigBytes,
            encoder.encode(bodyText)
        );

        if (!isValid) {
            console.error('Invalid signature');
            return new Response(JSON.stringify({ error: 'Invalid signature' }), {
                status: 401,
                headers: { ...corsHeaders, 'Content-Type': 'application/json' }
            });
        }

        const payload = JSON.parse(bodyText);
        const event = req.headers.get('x-github-event');

        console.log(`Received GitHub event: ${event}`);

        // Trigger update on push to main branch
        if (event === 'push' && payload.ref === 'refs/heads/main') {
            console.log('Detected push to main branch. Triggering update...');

            const GITHUB_TOKEN = Deno.env.get('GITHUB_TOKEN');
            const REPO_OWNER = payload.repository.owner.login;
            const REPO_NAME = payload.repository.name;

            if (GITHUB_TOKEN) {
                // Trigger a GitHub Action workflow dispatch
                // This will trigger the CI/CD pipeline in .github/workflows/main.yml
                const response = await fetch(
                    `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/actions/workflows/main.yml/dispatches`,
                    {
                        method: 'POST',
                        headers: {
                            'Authorization': `Bearer ${GITHUB_TOKEN}`,
                            'Accept': 'application/vnd.github.v3+json',
                            'Content-Type': 'application/json',
                            'User-Agent': 'Supabase-Edge-Function',
                        },
                        body: JSON.stringify({ ref: 'main' }),
                    }
                );
                console.log(`GitHub API Response status: ${response.status}`);

                console.log('Successfully received webhook and triggered deployment workflow.');
            } else {
                console.log('GITHUB_TOKEN not set, skipping remote trigger. Webhook verified successfully.');
            }
        }

        return new Response(JSON.stringify({ message: 'Webhook processed successfully' }), {
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });

    } catch (error) {
        console.error('Webhook error:', error.message);
        return new Response(JSON.stringify({ error: error.message }), {
            status: 500,
            headers: { ...corsHeaders, 'Content-Type': 'application/json' }
        });
    }
});
