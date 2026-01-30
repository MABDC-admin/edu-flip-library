import { useState, useCallback } from "react";
import { pdfjs } from "react-pdf";
import { supabase } from "@/integrations/supabase/client";

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

      for (let pageNum = 1; pageNum <= numPages; pageNum++) {
        const page = await pdfDocument.getPage(pageNum);
        const viewport = page.getViewport({ scale: 1.5 });

        const canvas = document.createElement("canvas");
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        const ctx = canvas.getContext("2d");

        if (!ctx) throw new Error("Failed to get 2D context");

        // Use `as any` because react-pdf types expect a `canvas` property
        // but at runtime the library works fine with just canvasContext + viewport.
        await (page.render({ canvasContext: ctx, viewport, canvas } as any) as any).promise;

        setProgress((p) => ({ ...p, status: "uploading" }));

        const blob = await new Promise<Blob | null>((resolve) =>
          canvas.toBlob(resolve, "image/png")
        );
        if (!blob) throw new Error(`Failed to export page ${pageNum} as PNG`);

        const imagePath = `${bookId}/page-${pageNum}.png`;
        const { error: uploadError } = await supabase.storage
          .from("book-pages")
          .upload(imagePath, blob, {
            contentType: "image/png",
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const {
          data: { publicUrl },
        } = supabase.storage.from("book-pages").getPublicUrl(imagePath);

        const { error: insertError } = await supabase.from("book_pages").insert({
          book_id: bookId,
          page_number: pageNum,
          image_url: publicUrl,
        });

        if (insertError) throw insertError;

        setProgress((p) => ({
          ...p,
          done: pageNum,
          status: pageNum === numPages ? "done" : "rendering",
        }));
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
