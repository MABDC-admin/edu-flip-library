import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-api-key, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

// Allowed tables for CRUD operations
const ALLOWED_TABLES = [
  "books",
  "book_pages",
  "book_annotations",
  "profiles",
  "schools",
  "academic_years",
  "sections",
  "student_sections",
  "subjects",
  "classes",
  "grades",
  "enrollments",
  "attendance_logs",
  "user_assigned_books",
  "reading_progress",
  "user_roles",
  "student_id_sequences",
];

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Validate API key
    const apiKey = req.headers.get("x-api-key");
    const expectedKey = Deno.env.get("SYNC_API_KEY");

    if (!apiKey || apiKey !== expectedKey) {
      return jsonResponse({ error: "Unauthorized: Invalid API key" }, 401);
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const url = new URL(req.url);
    const pathParts = url.pathname.split("/").filter(Boolean);
    // Expected path: /api/{table} or /api/{table}/{id}
    // Edge function name is "api", so after stripping function prefix:
    const table = url.searchParams.get("table");
    const id = url.searchParams.get("id");

    if (!table) {
      return jsonResponse({
        error: "Missing 'table' query parameter",
        allowed_tables: ALLOWED_TABLES,
        usage: {
          list: "GET ?table=books",
          get_one: "GET ?table=books&id={uuid}",
          create: "POST ?table=books  body: { data: {...} }",
          update: "PUT ?table=books&id={uuid}  body: { data: {...} }",
          delete: "DELETE ?table=books&id={uuid}",
          bulk_create: "POST ?table=books  body: { data: [{...}, {...}] }",
        },
      }, 400);
    }

    if (!ALLOWED_TABLES.includes(table)) {
      return jsonResponse({
        error: `Table '${table}' is not allowed`,
        allowed_tables: ALLOWED_TABLES,
      }, 400);
    }

    switch (req.method) {
      case "GET": {
        let query = supabase.from(table).select("*");

        // Filters from query params
        for (const [key, value] of url.searchParams.entries()) {
          if (key === "table" || key === "id" || key === "limit" || key === "offset" || key === "order") continue;
          query = query.eq(key, value);
        }

        if (id) {
          query = query.eq("id", id);
        }

        const limit = parseInt(url.searchParams.get("limit") || "100");
        const offset = parseInt(url.searchParams.get("offset") || "0");
        query = query.range(offset, offset + limit - 1);

        const order = url.searchParams.get("order");
        if (order) {
          const [col, dir] = order.split(":");
          query = query.order(col, { ascending: dir !== "desc" });
        }

        const { data, error, count } = await query;
        if (error) throw error;

        return jsonResponse({ data, count: data?.length || 0 });
      }

      case "POST": {
        const body = await req.json();
        const records = body.data;

        if (!records) {
          return jsonResponse({ error: "Missing 'data' in request body" }, 400);
        }

        const { data, error } = await supabase
          .from(table)
          .insert(Array.isArray(records) ? records : [records])
          .select();

        if (error) throw error;
        return jsonResponse({ data, created: data?.length || 0 }, 201);
      }

      case "PUT":
      case "PATCH": {
        if (!id) {
          return jsonResponse({ error: "Missing 'id' query parameter for update" }, 400);
        }

        const body = await req.json();
        const updates = body.data;

        if (!updates) {
          return jsonResponse({ error: "Missing 'data' in request body" }, 400);
        }

        const { data, error } = await supabase
          .from(table)
          .update(updates)
          .eq("id", id)
          .select();

        if (error) throw error;
        return jsonResponse({ data });
      }

      case "DELETE": {
        if (!id) {
          return jsonResponse({ error: "Missing 'id' query parameter for delete" }, 400);
        }

        const { data, error } = await supabase
          .from(table)
          .delete()
          .eq("id", id)
          .select();

        if (error) throw error;
        return jsonResponse({ data, deleted: data?.length || 0 });
      }

      default:
        return jsonResponse({ error: `Method ${req.method} not supported` }, 405);
    }
  } catch (error: any) {
    console.error("API error:", error);
    return jsonResponse({ error: error.message || "Internal server error" }, 500);
  }
});

function jsonResponse(body: any, status = 200) {
  return new Response(JSON.stringify(body, null, 2), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}
