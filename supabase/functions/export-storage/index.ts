import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
import JSZip from "https://esm.sh/jszip@3.10.1";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type, x-supabase-client-platform, x-supabase-client-platform-version, x-supabase-client-runtime, x-supabase-client-runtime-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    // Verify admin
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    // Create client with user's token to verify identity
    const userClient = createClient(supabaseUrl, Deno.env.get("SUPABASE_ANON_KEY")!, {
      global: { headers: { Authorization: authHeader } },
    });

    const { data: { user }, error: authError } = await userClient.auth.getUser(
      authHeader.replace("Bearer ", "")
    );

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Check admin role
    const adminClient = createClient(supabaseUrl, supabaseServiceKey);
    const { data: roles } = await adminClient
      .from("user_roles")
      .select("role")
      .eq("user_id", user.id)
      .eq("role", "admin");

    if (!roles || roles.length === 0) {
      return new Response(JSON.stringify({ error: "Admin access required" }), {
        status: 403,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // Parse request body for bucket selection
    const body = await req.json().catch(() => ({}));
    const requestedBuckets: string[] = body.buckets || [
      "pdf-uploads",
      "book-pages",
      "book-covers",
    ];

    const zip = new JSZip();

    for (const bucketName of requestedBuckets) {
      // List all files in the bucket
      const { data: files, error: listError } = await adminClient.storage
        .from(bucketName)
        .list("", { limit: 1000 });

      if (listError) {
        console.error(`Error listing ${bucketName}:`, listError);
        continue;
      }

      if (!files || files.length === 0) continue;

      // Recursively list files (handle folders)
      const allFiles = await listAllFiles(adminClient, bucketName, "");

      for (const filePath of allFiles) {
        const { data: fileData, error: downloadError } = await adminClient.storage
          .from(bucketName)
          .download(filePath);

        if (downloadError || !fileData) {
          console.error(`Error downloading ${bucketName}/${filePath}:`, downloadError);
          continue;
        }

        const arrayBuffer = await fileData.arrayBuffer();
        zip.file(`${bucketName}/${filePath}`, arrayBuffer);
      }
    }

    const zipBlob = await zip.generateAsync({ type: "uint8array" });

    return new Response(zipBlob, {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/zip",
        "Content-Disposition": `attachment; filename="storage-export-${new Date().toISOString().split("T")[0]}.zip"`,
      },
    });
  } catch (error) {
    console.error("Export error:", error);
    return new Response(
      JSON.stringify({ error: error.message || "Export failed" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});

async function listAllFiles(
  client: any,
  bucket: string,
  prefix: string
): Promise<string[]> {
  const { data, error } = await client.storage
    .from(bucket)
    .list(prefix, { limit: 1000 });

  if (error || !data) return [];

  const files: string[] = [];

  for (const item of data) {
    const fullPath = prefix ? `${prefix}/${item.name}` : item.name;

    if (item.id) {
      // It's a file
      files.push(fullPath);
    } else {
      // It's a folder, recurse
      const subFiles = await listAllFiles(client, bucket, fullPath);
      files.push(...subFiles);
    }
  }

  return files;
}
