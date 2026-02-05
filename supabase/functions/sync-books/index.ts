import { createClient } from 'npm:@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type, x-api-key',
}

Deno.serve(async (req) => {
  // Handle CORS preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    // Validate API key
    const apiKey = req.headers.get('x-api-key')
    const expectedKey = Deno.env.get('SYNC_API_KEY')

    if (!apiKey || apiKey !== expectedKey) {
      console.log('Unauthorized: Invalid or missing API key')
      return new Response(JSON.stringify({ error: 'Unauthorized: Invalid API key' }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 401,
      })
    }

    const supabaseUrl = Deno.env.get('SUPABASE_URL')!
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    
    const supabase = createClient(supabaseUrl, supabaseKey)

    const url = new URL(req.url)
    const bookId = url.searchParams.get('book_id')
    const gradeLevel = url.searchParams.get('grade_level')
    const includePages = url.searchParams.get('include_pages') !== 'false'

    console.log(`Sync request - book_id: ${bookId}, grade_level: ${gradeLevel}, include_pages: ${includePages}`)

    // Build books query
    let booksQuery = supabase
      .from('books')
      .select('*')
      .eq('status', 'ready')
      .order('grade_level', { ascending: true })
      .order('title', { ascending: true })

    if (bookId) {
      booksQuery = booksQuery.eq('id', bookId)
    }

    if (gradeLevel) {
      booksQuery = booksQuery.eq('grade_level', parseInt(gradeLevel))
    }

    const { data: books, error: booksError } = await booksQuery

    if (booksError) {
      console.error('Error fetching books:', booksError)
      throw booksError
    }

    let result: any = { books }

    // Fetch pages if requested
    if (includePages && books && books.length > 0) {
      const bookIds = books.map(b => b.id)
      
      const { data: pages, error: pagesError } = await supabase
        .from('book_pages')
        .select('*')
        .in('book_id', bookIds)
        .order('book_id')
        .order('page_number', { ascending: true })

      if (pagesError) {
        console.error('Error fetching pages:', pagesError)
        throw pagesError
      }

      // Group pages by book_id for easier consumption
      const pagesByBook: Record<string, any[]> = {}
      pages?.forEach(page => {
        if (!pagesByBook[page.book_id]) {
          pagesByBook[page.book_id] = []
        }
        pagesByBook[page.book_id].push(page)
      })

      result.pages = pages
      result.pages_by_book = pagesByBook
    }

    result.total_books = books?.length || 0
    result.synced_at = new Date().toISOString()

    console.log(`Sync complete - ${result.total_books} books returned`)

    return new Response(JSON.stringify(result), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 200,
    })

  } catch (error) {
    console.error('Sync error:', error)
    return new Response(JSON.stringify({ error: error.message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    })
  }
})
