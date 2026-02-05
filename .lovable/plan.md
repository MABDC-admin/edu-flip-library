
## Plan: Add API Key Authentication to sync-books Endpoint

### Overview
Add `x-api-key` header authentication to secure the sync-books endpoint, allowing your other project to authenticate using a shared secret key.

---

### Implementation Steps

**Step 1: Add the SYNC_API_KEY Secret**
- Request you to set a `SYNC_API_KEY` secret value
- This same key must be configured in your other project to match

**Step 2: Update CORS Headers**
- Add `x-api-key` to the allowed headers so browsers don't block the header in cross-origin requests

**Step 3: Add API Key Validation Logic**
- Extract the `x-api-key` header from incoming requests
- Compare it against the stored `SYNC_API_KEY` secret
- Return 401 Unauthorized if the key is missing or invalid
- Allow the request to proceed if the key matches

---

### Technical Details

```typescript
// Updated CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

// API key validation (added before database queries)
const apiKey = req.headers.get('x-api-key')
const expectedKey = Deno.env.get('SYNC_API_KEY')

if (!apiKey || apiKey !== expectedKey) {
  return new Response(JSON.stringify({ error: 'Unauthorized: Invalid API key' }), {
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    status: 401,
  })
}
```

---

### After Implementation
- You'll need to set the same `SYNC_API_KEY` value in both projects
- Your other project can then call the endpoint with the `x-api-key` header
