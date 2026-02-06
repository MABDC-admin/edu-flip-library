import { z } from "zod";

const envSchema = z.object({
    VITE_SUPABASE_URL: z.string().url(),
    VITE_SUPABASE_PUBLISHABLE_KEY: z.string().min(1),
    // Add other environment variables here as needed
});

const _env = envSchema.safeParse(import.meta.env);

if (!_env.success) {
    console.warn("Missing environment variables:", _env.error.flatten().fieldErrors);
}

export const env = _env.success
    ? _env.data
    : {
          VITE_SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL ?? "",
          VITE_SUPABASE_PUBLISHABLE_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY ?? "",
      };
