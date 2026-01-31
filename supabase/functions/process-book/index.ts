import { createClient } from "https://esm.sh/@supabase/supabase-js@2.93.3";

declare const Deno: any;

// Use pdfjs-serverless - optimized for Deno/serverless environments (no worker required)
import { resolvePDFJS } from "https://esm.sh/pdfjs-serverless@0.5.1?target=deno";

let cachedPdfjs: any | null = null;
async function getPdfjs(): Promise<any> {
  if (cachedPdfjs) return cachedPdfjs;

  // pdfjs-serverless exports a resolver function that returns the pdf.js API.
  cachedPdfjs = await resolvePDFJS();

  // Force-disable workers for edge-runtime compatibility.
  // Some builds still look at GlobalWorkerOptions even when disableWorker is set.
  if (cachedPdfjs?.GlobalWorkerOptions) {
    cachedPdfjs.GlobalWorkerOptions.workerSrc = "";
  }

  return cachedPdfjs;
}

// Deno type declarations for OffscreenCanvas (Web API available in Deno)
declare const OffscreenCanvas: {
  new(width: number, height: number): {
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

    const pdfjs = await getPdfjs();

    if (typeof pdfjs?.getDocument !== "function") {
      const resolvedKeys = pdfjs ? Object.keys(pdfjs) : [];
      throw new Error(
        `pdfjs.getDocument is not a function (resolved keys: ${resolvedKeys.join(
          ",",
        )})`,
      );
    }

    // Load PDF (explicitly disable workers for this runtime)
    const loadingTask = pdfjs.getDocument({
      data: pdfBytes,
      disableWorker: true,
      useSystemFonts: true,
    } as any);
    const pdfDocument = await loadingTask.promise;
    const pageCount = pdfDocument.numPages;

    console.log(`PDF has ${pageCount} pages`);

    // This backend runtime does not provide a Canvas implementation.
    // If OffscreenCanvas is missing, we cannot render pages to images here.
    const OffscreenCanvasCtor = (globalThis as any).OffscreenCanvas as
      | (new (width: number, height: number) => {
        width: number;
        height: number;
        getContext(contextId: "2d"): any;
        convertToBlob(options?: { type?: string; quality?: number }): Promise<Blob>;
      })
      | undefined;

    if (!OffscreenCanvasCtor) {
      await supabaseAdmin
        .from("books")
        .update({ status: "error", page_count: pageCount })
        .eq("id", bookId);
      throw new Error(
        "OffscreenCanvas is not available in this runtime, so PDF pages cannot be rendered to images on the backend. Run processing in the browser (admin upload) or use an external PDF-to-image service.",
      );
    }

    // Delete existing pages for this book (in case of reprocessing)
    await supabaseAdmin
      .from("book_pages")
      .delete()
      .eq("book_id", bookId);

    let processedPages = 0;
    let hadErrors = false;

    // Process each page
    for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
      try {
        const page = await pdfDocument.getPage(pageNum);

        // --- 1. Generate High-Res Image (scale 1.5) ---
        const highResViewport = page.getViewport({ scale: 1.5 });
        const highResCanvas = new OffscreenCanvasCtor(
          Math.floor(highResViewport.width),
          Math.floor(highResViewport.height),
        );
        const highResCtx = highResCanvas.getContext("2d");
        if (!highResCtx) throw new Error("Could not get high-res 2D context");

        await page.render({ canvasContext: highResCtx, viewport: highResViewport }).promise;
        const highResBlob = await highResCanvas.convertToBlob({ type: "image/png" });

        // --- 2. Generate Low-Res Thumbnail (scale 0.3) ---
        const thumbViewport = page.getViewport({ scale: 0.3 });
        const thumbCanvas = new OffscreenCanvasCtor(
          Math.floor(thumbViewport.width),
          Math.floor(thumbViewport.height),
        );
        const thumbCtx = thumbCanvas.getContext("2d");
        if (!thumbCtx) throw new Error("Could not get thumbnail 2D context");

        await page.render({ canvasContext: thumbCtx, viewport: thumbViewport }).promise;
        const thumbBlob = await thumbCanvas.convertToBlob({ type: "image/png" });

        // --- 3. Upload Both to Storage ---
        const imagePath = `${bookId}/page-${pageNum}.png`;
        const thumbPath = `${bookId}/thumb-${pageNum}.png`;

        // Upload High-Res
        const { error: highResUploadError } = await supabaseAdmin.storage
          .from("book-pages")
          .upload(imagePath, highResBlob, {
            contentType: "image/png",
            upsert: true
          });
        if (highResUploadError) throw highResUploadError;

        // Upload Thumbnail
        const { error: thumbUploadError } = await supabaseAdmin.storage
          .from("book-pages")
          .upload(thumbPath, thumbBlob, {
            contentType: "image/png",
            upsert: true
          });
        if (thumbUploadError) throw thumbUploadError;

        // --- 4. Get Public URLs ---
        const { data: { publicUrl: highResUrl } } = supabaseAdmin.storage
          .from("book-pages")
          .getPublicUrl(imagePath);

        const { data: { publicUrl: thumbUrl } } = supabaseAdmin.storage
          .from("book-pages")
          .getPublicUrl(thumbPath);

        // --- 5. Insert into database ---
        await supabaseAdmin.from("book_pages").insert({
          book_id: bookId,
          page_number: pageNum,
          image_url: highResUrl,
          thumbnail_url: thumbUrl,
        });

        processedPages++;

        if (pageNum % 5 === 0) {
          console.log(`Processed ${pageNum}/${pageCount} pages (High-Res + Thumbnails)`);
        }

      } catch (pageError) {
        console.error(`Error processing page ${pageNum}:`, pageError);
        hadErrors = true;
        // Continue to next page for resilience
      }
    }

    // Update book status
    await supabaseAdmin
      .from("books")
      .update({
        page_count: pageCount,
        status: hadErrors || processedPages !== pageCount ? "error" : "ready",
      })
      .eq("id", bookId);

    if (hadErrors || processedPages !== pageCount) {
      throw new Error(
        `Processed ${processedPages}/${pageCount} pages; rendering failed for at least one page.`,
      );
    }

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
