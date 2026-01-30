// deno-lint-ignore-file no-explicit-any
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

// Use pdfjs-serverless - optimized for Deno/serverless environments (no worker required)
// deno-lint-ignore no-explicit-any
const pdfjs: any = await import("https://esm.sh/pdfjs-serverless@0.5.1");

// Deno type declarations for OffscreenCanvas (Web API available in Deno)
declare const OffscreenCanvas: {
  new (width: number, height: number): {
    width: number;
    height: number;
    getContext(contextId: "2d"): any;
    convertToBlob(options?: { type?: string; quality?: number }): Promise<Blob>;
  };
};

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

    const pdfBytes = new Uint8Array(await pdfData.arrayBuffer());
    
    // Load PDF using pdfjs-serverless (no worker needed)
    const loadingTask = pdfjs.getDocument({ data: pdfBytes, useSystemFonts: true });
    const pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;

    console.log(`PDF has ${pageCount} pages`);

    // Delete existing pages for this book (in case of reprocessing)
    await supabaseAdmin
      .from("book_pages")
      .delete()
      .eq("book_id", bookId);

    // Process each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        // Setup offscreen canvas
        const canvas = new OffscreenCanvas(Math.floor(viewport.width), Math.floor(viewport.height));
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

        if (pageNum % 10 === 0) {
          console.log(`Processed ${pageNum}/${pageCount} pages`);
        }

      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        // Continue to next page for resilience
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

    console.log(`Book ${bookId} processed successfully with ${pageCount} pages`);

    return new Response(
      JSON.stringify({ success: true, pageCount, bookId }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (err) {
    const error = err as Error;
    console.error("Process error:", error);

    return new Response(
      JSON.stringify({ error: error.message || "Unknown error" }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
