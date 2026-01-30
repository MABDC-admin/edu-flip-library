

# Implementation Plan: `process-book` Edge Function

## Overview
Create a Supabase Edge Function that processes uploaded PDFs by counting their pages and updating the book record status from "processing" to "ready".

---

## Architecture Flow

```text
Frontend (Admin Books)          Edge Function                   Supabase
       |                             |                              |
       |-- POST /process-book ------>|                              |
       |   { bookId, pdfPath }       |                              |
       |                             |-- Download PDF ------------->|
       |                             |   (pdf-uploads bucket)       |
       |                             |<-- PDF binary data ---------|
       |                             |                              |
       |                             |-- Parse with pdf-lib        |
       |                             |   (count pages)              |
       |                             |                              |
       |                             |-- UPDATE books ------------->|
       |                             |   page_count, status='ready' |
       |                             |<-- Success -----------------|
       |<-- { success, pageCount } --|                              |
```

---

## Implementation Steps

### 1. Create Edge Function Directory & Files

**File: `supabase/functions/process-book/index.ts`**

The function will:
- Accept POST requests with `bookId` and `pdfPath` in the body
- Use the service role client to download the PDF from private storage
- Parse the PDF using `pdf-lib` to count pages
- Update the `books` table with `page_count` and `status = 'ready'`
- Handle errors gracefully, setting `status = 'error'` on failure

Key implementation details:
- Uses `npm:pdf-lib` for reliable PDF parsing in Deno
- Creates admin client with `SUPABASE_SERVICE_ROLE_KEY` for storage access
- Includes CORS headers for browser requests
- Validates admin authentication before processing

### 2. Update `supabase/config.toml`

Add function configuration with JWT verification disabled (we'll verify auth in code):

```toml
[functions.process-book]
verify_jwt = false
```

### 3. Update Frontend to Call the Function

**File: `src/pages/admin/Books.tsx`**

After uploading the PDF, the `createBook` mutation will invoke the edge function:

```typescript
// After file uploads complete
await supabase.functions.invoke('process-book', {
  body: { bookId, pdfPath: `${bookId}/source.pdf` }
});
```

This triggers the processing automatically when a book is created.

---

## Technical Details

### Edge Function Code Structure

```typescript
// 1. CORS headers for browser access
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, ...'
}

// 2. Create admin client with service role
const supabaseAdmin = createClient(url, serviceRoleKey)

// 3. Download PDF from private bucket
const { data: pdfData } = await supabaseAdmin.storage
  .from('pdf-uploads')
  .download(pdfPath)

// 4. Count pages using pdf-lib
const pdfDoc = await PDFDocument.load(await pdfData.arrayBuffer())
const pageCount = pdfDoc.getPageCount()

// 5. Update book record
await supabaseAdmin.from('books')
  .update({ page_count: pageCount, status: 'ready' })
  .eq('id', bookId)
```

### Security Considerations
- Function validates the calling user is an admin before processing
- Uses service role key only server-side (never exposed to client)
- PDF bucket remains private - only edge function can access via admin client

---

## Files to Create/Modify

| File | Action | Purpose |
|------|--------|---------|
| `supabase/functions/process-book/index.ts` | Create | Main edge function logic |
| `supabase/config.toml` | Update | Add function configuration |
| `src/pages/admin/Books.tsx` | Update | Call edge function after upload |

---

## Bug Fixes (Existing TypeScript Errors)

The following minor fixes will also be applied:

1. **`src/components/ui/calendar.tsx`** - Remove unused `_props` parameter declarations
2. **`src/contexts/AuthContext.tsx`** - Prefix unused `event` parameter with underscore

---

## Expected Outcome

After implementation:
1. Admin uploads a PDF book
2. Book is created with `status: 'processing'`
3. Edge function is automatically invoked
4. PDF is downloaded and page count is extracted
5. Book record is updated with `page_count` and `status: 'ready'`
6. Students can now see the book in their grade-filtered library

