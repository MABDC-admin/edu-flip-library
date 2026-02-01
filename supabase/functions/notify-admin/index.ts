import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const RESEND_API_KEY = Deno.env.get("RESEND_API_KEY");
const NOTIFY_EMAIL = "sottodennis@gmail.com";
const SENDER_EMAIL = "ebook@mabdc.com";

const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
};

interface RequestBody {
    type: "login" | "read";
    user_email: string;
    user_role: string;
    book_title?: string;
}

serve(async (req) => {
    if (req.method === "OPTIONS") {
        return new Response("ok", { headers: corsHeaders });
    }

    try {
        const { type, user_email, user_role, book_title } = await req.json() as RequestBody;

        let subject = "";
        let html = "";

        const timestamp = new Date().toLocaleString("en-US", { timeZone: "Asia/Manila" });

        if (type === "login") {
            subject = `[MABDC Admin] User Login: ${user_email}`;
            html = `
        <h2>User Login Alert</h2>
        <p><strong>User:</strong> ${user_email}</p>
        <p><strong>Role:</strong> ${user_role}</p>
        <p><strong>Time:</strong> ${timestamp}</p>
      `;
        } else if (type === "read") {
            subject = `[MABDC Admin] Book Accessed: ${book_title}`;
            html = `
        <h2>Book Reading Alert</h2>
        <p><strong>User:</strong> ${user_email}</p>
        <p><strong>Role:</strong> ${user_role}</p>
        <p><strong>Book:</strong> ${book_title}</p>
        <p><strong>Time:</strong> ${timestamp}</p>
      `;
        } else {
            return new Response(JSON.stringify({ error: "Invalid type" }), {
                headers: { ...corsHeaders, "Content-Type": "application/json" },
                status: 400,
            });
        }

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

        const data = await res.json();

        return new Response(JSON.stringify(data), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 200,
        });
    } catch (error) {
        const message = error instanceof Error ? error.message : "Unknown error";
        return new Response(JSON.stringify({ error: message }), {
            headers: { ...corsHeaders, "Content-Type": "application/json" },
            status: 400,
        });
    }
});
