import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import { PDFDocument } from "https://esm.sh/pdf-lib@1.17.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  // Handle CORS preflight requests
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAnonKey = Deno.env.get("SUPABASE_ANON_KEY")!;

    // Validate the calling user is an admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader?.startsWith("Bearer ")) {
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Create a client with the user's token to verify admin status
    const userClient = createClient(supabaseUrl, supabaseAnonKey, {
      global: { headers: { Authorization: authHeader } },
    });

    const token = authHeader.replace("Bearer ", "");
    const { data: claimsData, error: claimsError } = await userClient.auth.getClaims(token);

    if (claimsError || !claimsData?.claims) {
      console.error("Auth error:", claimsError);
      return new Response(
        JSON.stringify({ error: "Unauthorized" }),
        { status: 401, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    const userId = claimsData.claims.sub as string;

    // Create admin client with service role to check if user is admin
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { data: roleData, error: roleError } = await supabaseAdmin
      .from("user_roles")
      .select("role")
      .eq("user_id", userId)
      .single();

    if (roleError || roleData?.role !== "admin") {
      console.error("Not admin:", roleError || "Role is not admin");
      return new Response(
        JSON.stringify({ error: "Only admins can process books" }),
        { status: 403, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse request body
    const { bookId, pdfPath } = await req.json();

    if (!bookId || !pdfPath) {
      return new Response(
        JSON.stringify({ error: "Missing bookId or pdfPath" }),
        { status: 400, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Processing book ${bookId} from path ${pdfPath}`);

    // Download PDF from storage using admin client
    const { data: pdfData, error: downloadError } = await supabaseAdmin.storage
      .from("pdf-uploads")
      .download(pdfPath);

    if (downloadError || !pdfData) {
      console.error("Download error:", downloadError);
      // Update book status to error
      await supabaseAdmin
        .from("books")
        .update({ status: "error" })
        .eq("id", bookId);

      return new Response(
        JSON.stringify({ error: "Failed to download PDF", details: downloadError?.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Parse PDF and count pages
    let pageCount: number;
    try {
      const pdfBytes = await pdfData.arrayBuffer();
      const pdfDoc = await PDFDocument.load(pdfBytes);
      pageCount = pdfDoc.getPageCount();
      console.log(`PDF has ${pageCount} pages`);
    } catch (parseError) {
      console.error("PDF parse error:", parseError);
      // Update book status to error
      await supabaseAdmin
        .from("books")
        .update({ status: "error" })
        .eq("id", bookId);

      return new Response(
        JSON.stringify({ error: "Failed to parse PDF", details: String(parseError) }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    // Update book record with page count and status
    const { error: updateError } = await supabaseAdmin
      .from("books")
      .update({
        page_count: pageCount,
        status: "ready",
      })
      .eq("id", bookId);

    if (updateError) {
      console.error("Update error:", updateError);
      return new Response(
        JSON.stringify({ error: "Failed to update book record", details: updateError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`Book ${bookId} processed successfully with ${pageCount} pages`);

    return new Response(
      JSON.stringify({ success: true, pageCount, bookId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error", details: String(error) }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
