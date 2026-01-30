
# Implementation Plan: PDF Page Image Generation for Flipbook

## Problem Summary

The flipbook viewer shows blank pages because:
1. The current `process-book` function only counts pages - it does NOT render PDF pages to images
2. The `book_pages` table is empty (0 records)
3. The `book-pages` storage bucket is private (images won't be accessible)

---

## Solution Architecture

```text
PDF Processing Flow (Enhanced)

Admin Uploads PDF
       ↓
process-book Edge Function
       ↓
┌──────────────────────────────────────────────────────────┐
│  1. Download PDF from pdf-uploads bucket                 │
│  2. For each page:                                       │
│     a. Render page to PNG image using pdf.js             │
│     b. Upload image to book-pages bucket                 │
│     c. Insert record into book_pages table               │
│  3. Update books table: page_count, status='ready'       │
└──────────────────────────────────────────────────────────┘
       ↓
FlipbookReader displays images from book_pages
```

---

## Implementation Steps

### Step 1: Make book-pages Bucket Public

The bucket needs to be public so the frontend can load page images.

```sql
UPDATE storage.buckets SET public = true WHERE id = 'book-pages';
```

### Step 2: Update Edge Function for Image Generation

Replace `pdf-lib` with `pdf.js` which supports rendering pages to canvas.

**Key changes to `supabase/functions/process-book/index.ts`:**

1. Import `pdf.js` instead of `pdf-lib`
2. For each page in the PDF:
   - Render to `OffscreenCanvas` at 1.5x scale for good quality
   - Convert canvas to PNG blob
   - Upload to `book-pages` bucket as `{bookId}/page-{num}.png`
   - Insert record into `book_pages` table with public URL
3. Update book status to 'ready' when complete

**Technical implementation:**

```typescript
import * as pdfjs from "https://esm.sh/pdfjs-dist@4.0.379/build/pdf.mjs";

// Load PDF
const loadingTask = pdfjs.getDocument({ data: pdfBytes });
const pdfDocument = await loadingTask.promise;
const pageCount = pdfDocument.numPages;

// Process each page
for (let pageNum = 1; pageNum <= pageCount; pageNum++) {
  const page = await pdfDocument.getPage(pageNum);
  const viewport = page.getViewport({ scale: 1.5 });
  
  // Render to canvas
  const canvas = new OffscreenCanvas(viewport.width, viewport.height);
  const ctx = canvas.getContext("2d");
  await page.render({ canvasContext: ctx, viewport }).promise;
  
  // Convert to PNG
  const blob = await canvas.convertToBlob({ type: "image/png" });
  
  // Upload to storage
  const imagePath = `${bookId}/page-${pageNum}.png`;
  await supabaseAdmin.storage.from("book-pages").upload(imagePath, blob);
  
  // Get public URL and insert into database
  const { publicUrl } = supabaseAdmin.storage.from("book-pages").getPublicUrl(imagePath);
  await supabaseAdmin.from("book_pages").insert({
    book_id: bookId,
    page_number: pageNum,
    image_url: publicUrl
  });
}
```

---

## Files to Modify

| File | Action | Changes |
|------|--------|---------|
| `supabase/functions/process-book/index.ts` | Rewrite | Replace pdf-lib with pdf.js, add page rendering and upload logic |
| Database | SQL Migration | Make book-pages bucket public |

---

## Technical Considerations

### Memory Management
- Processing large PDFs (100+ pages) may hit memory limits
- Consider processing in batches or implementing pagination for very large books

### Timeout Handling  
- Edge functions have a timeout limit
- For PDFs with many pages, the function may need chunking or async processing

### Image Quality
- Scale factor of 1.5 provides good balance of quality and file size
- Can be adjusted based on requirements (1.0 = smaller files, 2.0 = higher quality)

### Error Recovery
- If processing fails mid-way, some pages may be uploaded but not all
- Consider adding cleanup logic or resumable processing

---

## Expected Outcome

After implementation:
1. Admin uploads a PDF book
2. Edge function processes each page → generates PNG images
3. Images stored in public `book-pages` bucket
4. Records inserted into `book_pages` table with image URLs
5. FlipbookReader queries `book_pages` and displays actual content
6. Students can read books with visible page content
