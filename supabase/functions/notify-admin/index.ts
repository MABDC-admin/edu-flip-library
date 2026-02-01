import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_EMAIL = "sottodennis@gmail.com";
// Fallback to onboarding@resend.dev if domain not verified
const SENDER_EMAIL = Deno.env.get("SENDER_EMAIL") || "onboarding@resend.dev";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
    type: "login" | "read" | "test";
    user_email: string;
    user_role: string;
    book_title?: string;
}

serve(async (req) => {
    console.log(`Request received: ${req.method}`);

    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    console.log(`API Key detected: ${!!RESEND_API_KEY} (length: ${RESEND_API_KEY?.length || 0})`);

    try {
        const body = await req.json() as RequestBody;
        console.log("Request body:", JSON.stringify(body));

        const { type, user_email, user_role, book_title } = body;

        let subject = "";
        let html = "";
        const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });

        if (type === "login") {
            subject = `[MABDC Admin] User Login: ${user_email}`;
            html = `<h2>User Login Alert</h2><p><strong>User:</strong> ${user_email}</p><p><strong>Role:</strong> ${user_role}</p><p><strong>Time:</strong> ${timestamp}</p>`;
        } else if (type === "read") {
            subject = `[MABDC Admin] Book Accessed: ${book_title}`;
            html = `<h2>Book Reading Alert</h2><p><strong>User:</strong> ${user_email}</p><p><strong>Role:</strong> ${user_role}</p><p><strong>Book:</strong> ${book_title}</p><p><strong>Time:</strong> ${timestamp}</p>`;
        } else if (type === "test") {
            subject = `[MABDC Admin] Test Notification`;
            html = `<h2>Test Notification</h2><p>This is a test email triggered manually from the Admin Dashboard.</p><p><strong>Time:</strong> ${timestamp}</p>`;
        } else {
            throw new Error("Invalid notification type");
        }

        console.log(`Sending email via Resend to ${NOTIFY_EMAIL} from ${SENDER_EMAIL}`);

        const res = await fetch("https://api.resend.com/emails", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                Authorization: `Bearer ${RESEND_API_KEY}`,
            },
            body: JSON.stringify({
                from: SENDER_EMAIL,
                to: NOTIFY_EMAIL,
                subject: subject,
                html: html,
            }),
        });

        const resData = await res.json();
        console.log("Resend API response:", JSON.stringify(resData));

        if (!res.ok) {
            return new Response(JSON.stringify({ error: "Resend API Error", details: resData }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: res.status,
            });
        }

        return new Response(JSON.stringify(resData), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        console.error("Function error:", message);
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
