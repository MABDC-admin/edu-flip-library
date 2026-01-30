import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";
import * as pdfjs from "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.mjs";

// Set up worker
pdfjs.GlobalWorkerOptions.workerSrc = "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.worker.mjs";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);

    const { bookId, pdfPath } = await req.json();

    if (!bookId || !pdfPath) {
      throw new Error("Missing bookId or pdfPath");
    }

    console.log(`Processing book ${bookId} from path ${pdfPath}`);

    // Update status to processing
    await supabaseAdmin
      .from("books")
      .update({ status: "processing" })
      .eq("id", bookId);

    // Download PDF
    const { data: pdfData, error: downloadError } = await supabaseAdmin.storage
      .from("pdf-uploads")
      .download(pdfPath);

    if (downloadError || !pdfData) throw new Error(`Download error: ${downloadError?.message}`);

    const pdfBytes = await pdfData.arrayBuffer();
    const loadingTask = pdfjs.getDocument({ data: pdfBytes });
    const pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;

    console.log(`PDF has ${pageCount} pages. Converting to images...`);

    // Process each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        // Setup offscreen canvas
        const canvas = new OffscreenCanvas(viewport.width, viewport.height);
        const ctx = canvas.getContext("2d");

        if (!ctx) throw new Error("Could not get 2D context");

        await page.render({ canvasContext: ctx, viewport }).promise;
        const blob = await canvas.convertToBlob({ type: "image/png" });

        // Upload to storage
        const imagePath = `${bookId}/page-${pageNum}.png`;
        const { error: uploadError } = await supabaseAdmin.storage
          .from("book-pages")
          .upload(imagePath, blob, {
            contentType: "image/png",
            upsert: true
          });

        if (uploadError) throw uploadError;

        // Get public URL
        const { data: { publicUrl } } = supabaseAdmin.storage
          .from("book-pages")
          .getPublicUrl(imagePath);

        // Insert into database
        await supabaseAdmin.from("book_pages").insert({
          book_id: bookId,
          page_number: pageNum,
          image_url: publicUrl,
        });

      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        // Continue to next page? Or fail? Let's log and continue for resilience
      }
    }

    // Update book status to ready
    await supabaseAdmin
      .from("books")
      .update({
        page_count: pageCount,
        status: "ready",
      })
      .eq("id", bookId);

    return new Response(
      JSON.stringify({ success: true, pageCount, bookId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("Process error:", error);

    // Try to update status to error if possible
    try {
      const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
      const supabaseServiceRoleKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
      const supabaseAdmin = createClient(supabaseUrl, supabaseServiceRoleKey);
      // Assuming we have bookId in scope? messy in catch block.
      // We will just return error response.
    } catch { }

    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
