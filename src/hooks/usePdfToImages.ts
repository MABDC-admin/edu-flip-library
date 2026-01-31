import { useState, useCallback } from "react";
import { pdfjs } from "react-pdf";
import { supabase } from "@/integrations/supabase/client";

// Configure PDF.js worker using local bundled worker (Vite-compatible)
pdfjs.GlobalWorkerOptions.workerSrc = new URL(
  "pdfjs-dist/build/pdf.worker.min.mjs",
  import.meta.url
).toString();

/**
 * In-browser PDF-to-image converter.
 * Uses react-pdf (pdf.js) + canvas to render each page as a PNG,
 * uploads to storage, and inserts rows into book_pages.
 */
export interface RenderProgress {
  total: number;
  done: number;
  status: "idle" | "rendering" | "uploading" | "done" | "error";
  error?: string;
}

export function usePdfToImages() {
  const [progress, setProgress] = useState<RenderProgress>({
    total: 0,
    done: 0,
    status: "idle",
  });

  const processInBrowser = useCallback(
    async (bookId: string, pdfFile: File): Promise<number> => {
      const arrayBuffer = await pdfFile.arrayBuffer();
      const loadingTask = pdfjs.getDocument({ data: arrayBuffer });
      const pdfDocument = await loadingTask.promise;
      const numPages = pdfDocument.numPages;

      setProgress({ total: numPages, done: 0, status: "rendering" });

      // Delete any existing pages for this book (in case of re-upload)
      await supabase.from("book_pages").delete().eq("book_id", bookId);

      const BATCH_SIZE = 3; // Process 3 pages at a time to stay responsive
      
      for (let i = 1; i <= numPages; i += BATCH_SIZE) {
        const batchEnd = Math.min(i + BATCH_SIZE - 1, numPages);
        const batchPromises = [];

        for (let pageNum = i; pageNum <= batchEnd; pageNum++) {
          batchPromises.push((async (pNum) => {
            const page = await pdfDocument.getPage(pNum);
            
            // 1. Render High-Res PNG (Scale 2.0)
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement("canvas");
            canvas.width = Math.floor(viewport.width);
            canvas.height = Math.floor(viewport.height);
            const ctx = canvas.getContext("2d");
            if (!ctx) throw new Error("Failed to get 2D context");
            await (page.render({ canvasContext: ctx, viewport, canvas } as any) as any).promise;
            const pngBlob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png", 0.9));
            if (!pngBlob) throw new Error(`Failed to export page ${pNum} as PNG`);

            // 2. Render Thumbnail (Scale 0.3)
            const thumbViewport = page.getViewport({ scale: 0.3 });
            const thumbCanvas = document.createElement("canvas");
            thumbCanvas.width = Math.floor(thumbViewport.width);
            thumbCanvas.height = Math.floor(thumbViewport.height);
            const thumbCtx = thumbCanvas.getContext("2d");
            if (thumbCtx) {
              await (page.render({ canvasContext: thumbCtx, viewport: thumbViewport, canvas: thumbCanvas } as any) as any).promise;
            }
            const thumbBlob = await new Promise<Blob | null>((resolve) => thumbCanvas.toBlob(resolve, "image/png", 0.7));

            // 3. Upload PNGs
            const imagePath = `${bookId}/page-${pNum}.png`;
            const thumbPath = `${bookId}/thumb-${pNum}.png`;

            const [pngUpload, thumbUpload] = await Promise.all([
              supabase.storage.from("book-pages").upload(imagePath, pngBlob, { contentType: "image/png", upsert: true }),
              thumbBlob ? supabase.storage.from("book-pages").upload(thumbPath, thumbBlob, { contentType: "image/png", upsert: true }) : Promise.resolve({ error: null })
            ]);

            if (pngUpload.error) throw pngUpload.error;

            const { data: { publicUrl: pngUrl } } = supabase.storage.from("book-pages").getPublicUrl(imagePath);
            let thumbPublicUrl = null;
            if (thumbBlob && !thumbUpload.error) {
              const { data: { publicUrl } } = supabase.storage.from("book-pages").getPublicUrl(thumbPath);
              thumbPublicUrl = publicUrl;
            }

            // 5. Insert to DB
            const { error: insertError } = await supabase.from("book_pages").insert({
              book_id: bookId,
              page_number: pNum,
              image_url: pngUrl,
              svg_url: null,
              thumbnail_url: thumbPublicUrl,
            });

            if (insertError) throw insertError;

            setProgress((p) => ({
              ...p,
              done: p.done + 1,
              status: p.done + 1 === numPages ? "done" : "rendering",
            }));
          })(pageNum));
        }

        await Promise.all(batchPromises);
      }

      // Cleanup pdf.js resources
      pdfDocument.destroy();

      setProgress((p) => ({ ...p, status: "done" }));
      return numPages;
    },
    []
  );

  const reset = useCallback(() => {
    setProgress({ total: 0, done: 0, status: "idle" });
  }, []);

  return { progress, processInBrowser, reset };
}
